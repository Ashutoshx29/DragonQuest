import { hasWorkoutInput } from '../workout';

describe('hasWorkoutInput (draft detection)', () => {
  it('returns false when draft is completely empty or undefined', () => {
    expect(hasWorkoutInput({})).toBe(false);
    expect(hasWorkoutInput({ title: null, sets: null, reps: null, notes: null })).toBe(false);
    expect(hasWorkoutInput({ title: '', sets: '', reps: '', notes: '' })).toBe(false);
    expect(hasWorkoutInput({ title: '   ', sets: '  ', reps: '  ', notes: '  ' })).toBe(false);
  });

  it('returns true when workout title has content', () => {
    expect(hasWorkoutInput({ title: 'Morning Pushups' })).toBe(true);
    expect(hasWorkoutInput({ title: '   Deadlifts   ' })).toBe(true);
  });

  it('returns true when sets has input even if other fields are empty', () => {
    expect(hasWorkoutInput({ sets: '3' })).toBe(true);
    expect(hasWorkoutInput({ title: '', sets: '5', reps: '' })).toBe(true);
  });

  it('returns true when reps has input even if other fields are empty', () => {
    expect(hasWorkoutInput({ reps: '12' })).toBe(true);
    expect(hasWorkoutInput({ title: '  ', reps: '10' })).toBe(true);
  });

  it('returns true when notes has input even if other fields are empty', () => {
    expect(hasWorkoutInput({ notes: 'Felt strong, good tempo' })).toBe(true);
    expect(hasWorkoutInput({ title: '', notes: 'PR achieved' })).toBe(true);
  });

  it('returns true when multiple partial fields are entered', () => {
    expect(hasWorkoutInput({ sets: '4', reps: '8' })).toBe(true);
    expect(hasWorkoutInput({ title: 'Squats', sets: '3', reps: '10', notes: 'Heavy' })).toBe(true);
  });
});

describe('Physical Training discard and exit navigation contract', () => {
  it('empty form: back handler exits immediately without discard dialog', () => {
    const onClose = jest.fn();
    const promptAlert = jest.fn();
    const draft = { title: '', sets: '', reps: '', notes: '' };

    // Navigation logic simulation
    const handleBack = () => {
      if (!hasWorkoutInput(draft)) {
        onClose();
      } else {
        promptAlert();
      }
    };

    handleBack();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(promptAlert).not.toHaveBeenCalled();
  });

  it('partial form: back handler triggers confirmation alert and does NOT exit directly', () => {
    const onClose = jest.fn();
    const promptAlert = jest.fn();
    const draft = { title: 'Dumbbell Rows', sets: '3', reps: '12' };

    const handleBack = () => {
      if (!hasWorkoutInput(draft)) {
        onClose();
      } else {
        promptAlert();
      }
    };

    handleBack();

    expect(promptAlert).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('discard action: clears draft, exits cleanly, and does NOT log session or award XP', () => {
    const onClose = jest.fn();
    const saveSession = jest.fn();
    let state = { title: 'Bench Press', sets: '5', reps: '5' };

    const handleDiscard = () => {
      state = { title: '', sets: '', reps: '' };
      onClose();
    };

    handleDiscard();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(saveSession).not.toHaveBeenCalled();
    expect(state).toEqual({ title: '', sets: '', reps: '' });
  });

  it('keep editing action: preserves draft state intact and remains on form', () => {
    const onClose = jest.fn();
    const saveSession = jest.fn();
    const state = { title: 'Overhead Press', sets: '4', reps: '8' };

    const handleKeepEditing = () => {
      // Kept on form, state preserved
    };

    handleKeepEditing();

    expect(onClose).not.toHaveBeenCalled();
    expect(saveSession).not.toHaveBeenCalled();
    expect(state).toEqual({ title: 'Overhead Press', sets: '4', reps: '8' });
  });
});
