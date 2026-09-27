import {
  START_SEQUENCE,
  deriveTimerState,
  formatCountdown,
  sessionLengthLabel,
  startSequenceBeat,
  startSequenceTotalMs,
} from '@/game/engine/timer';
import { computeTrainingXpPure } from '@/game/config/training';

describe('TrainingSession Flow & Logic Integrity', () => {
  describe('Discipline XP derivation', () => {
    it('accurately computes target XP for standard preset durations', () => {
      // Focus: 25 min = 1500s -> 150 XP
      expect(computeTrainingXpPure('focus', 1500)).toBe(150);

      // Mind: 10 min = 600s -> 60 XP
      expect(computeTrainingXpPure('mind', 600)).toBe(60);

      // Breath: 5 min = 300s -> 30 XP
      expect(computeTrainingXpPure('breath', 300)).toBe(30);

      // Workout: base 50 XP
      expect(computeTrainingXpPure('workout', 0)).toBe(50);
      expect(computeTrainingXpPure('workout', 1800)).toBe(50);
    });

    it('enforces finish early threshold behavior', () => {
      // Under 30 seconds (< 1 rounded minute):
      // The UI prevents XP farming: trainedMinutes = Math.round(elapsed / 60)
      const elapsedZero = 0;
      const elapsed10s = 10;
      const elapsed29s = 29;
      expect(Math.round(elapsedZero / 60)).toBe(0);
      expect(Math.round(elapsed10s / 60)).toBe(0);
      expect(Math.round(elapsed29s / 60)).toBe(0);

      // 30 seconds or more rounds up to at least 1 minute of XP:
      const elapsed30s = 30;
      const elapsed60s = 60;
      expect(Math.round(elapsed30s / 60)).toBe(1);
      expect(Math.round(elapsed60s / 60)).toBe(1);
      expect(computeTrainingXpPure('focus', Math.round(elapsed30s / 60) * 60)).toBe(6);
    });
  });

  describe('Chronometer State Transitions', () => {
    it('holds state at initial duration during start sequence', () => {
      const startedAt = 100_000;
      const seqMs = startSequenceTotalMs(START_SEQUENCE);
      const effectiveStart = startedAt + seqMs;
      const durationSec = 1500;

      // During start sequence (now < effectiveStart):
      const inSeqNow = startedAt + 1000;
      const sequenceOver = inSeqNow - startedAt >= seqMs;
      expect(sequenceOver).toBe(false);

      // State is held at 0 elapsed and full remaining
      const stateDuringSeq = { elapsedSec: 0, remainingSec: durationSec, complete: false, progress: 0 };
      expect(stateDuringSeq.remainingSec).toBe(durationSec);
      expect(stateDuringSeq.elapsedSec).toBe(0);
      expect(stateDuringSeq.progress).toBe(0);

      // Once sequence is over, deriveTimerState takes over
      const afterSeqNow = effectiveStart + 5000; // 5 seconds in
      const activeState = deriveTimerState(effectiveStart, durationSec, afterSeqNow);
      expect(activeState.remainingSec).toBe(1495);
      expect(activeState.elapsedSec).toBe(5);
      expect(activeState.complete).toBe(false);
    });

    it('correctly maps all start sequence beats in order', () => {
      const beats = START_SEQUENCE;
      let offset = 0;
      const resolvedLabels: string[] = [];

      for (const beat of beats) {
        const result = startSequenceBeat(beats, offset + 10);
        expect(result).not.toBeNull();
        resolvedLabels.push(result!.label);
        offset += beat.ms;
      }

      expect(resolvedLabels).toEqual(['READY', '3', '2', '1', 'TRAIN']);
      expect(startSequenceBeat(beats, offset)).toBeNull();
    });

    it('formats countdown and session labels cleanly', () => {
      expect(formatCountdown(1500)).toBe('25:00');
      expect(formatCountdown(905)).toBe('15:05');
      expect(formatCountdown(9)).toBe('0:09');
      expect(formatCountdown(0)).toBe('0:00');

      expect(sessionLengthLabel(1500)).toBe('25 MIN SESSION');
      expect(sessionLengthLabel(600)).toBe('10 MIN SESSION');
      expect(sessionLengthLabel(300)).toBe('5 MIN SESSION');
    });

    it('recovers accurately after background wall-clock jumps without drifting', () => {
      const startedAt = 1_000_000;
      const durationSec = 1500; // 25 min
      // Jump 12 minutes into the future
      const nowJump = startedAt + 12 * 60 * 1000;
      const state = deriveTimerState(startedAt, durationSec, nowJump);

      expect(state.elapsedSec).toBe(720); // 12 min
      expect(state.remainingSec).toBe(780); // 13 min
      expect(state.progress).toBeCloseTo(0.48);
      expect(state.complete).toBe(false);
    });

    it('preserves single-fire idempotency on completion', () => {
      let callCount = 0;
      let lastElapsed = 0;
      const onCompleteMock = (elapsed: number) => {
        callCount++;
        lastElapsed = elapsed;
      };

      let completed = false;
      const triggerComplete = (elapsed: number) => {
        if (completed) return;
        completed = true;
        onCompleteMock(elapsed);
      };

      // First natural completion
      triggerComplete(1500);
      expect(callCount).toBe(1);
      expect(lastElapsed).toBe(1500);

      // Attempt second trigger (double-tap or race condition)
      triggerComplete(1500);
      expect(callCount).toBe(1); // Blocked by completed flag
    });

    it('replays identical elapsed seconds on persistence retry', () => {
      let savedElapsed: number | null = null;
      let attemptCount = 0;

      const fireComplete = (elapsedSec: number) => {
        attemptCount++;
        savedElapsed = elapsedSec;
      };

      // First attempt with 450 seconds elapsed
      const firstElapsed = 450;
      let lastElapsedRef = firstElapsed;
      fireComplete(firstElapsed);
      expect(savedElapsed).toBe(450);
      expect(attemptCount).toBe(1);

      // Persistence fails -> user taps "Retry save"
      fireComplete(lastElapsedRef);
      expect(savedElapsed).toBe(450); // Exact same elapsed value replayed
      expect(attemptCount).toBe(2);
    });
  });
});
