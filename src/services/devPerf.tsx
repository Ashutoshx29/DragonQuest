import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette, radius } from '@/design-system/tokens';

/**
 * Dev-only frame-rate badge (F): a tiny, corner-docked FPS readout for
 * profiling sessions. Deliberately SMALL and toggleable so manual testing /
 * UX reviews never have a large overlay covering the timer — unlike the RN
 * dev-menu perf monitor, which is a big fixed widget.
 *
 * Gated behind __DEV__: the entire component is compiled out of release
 * builds, so production-facing presentation can never show it.
 */

const SAMPLE_MS = 1000;

// ── Tiny visibility pub/sub so the Settings toggle updates the badge live.
// Module-level state survives navigation; default OFF (unobstructed UX).
let devPerfVisible = false;
const listeners = new Set<(visible: boolean) => void>();

/** Dev-only: show/hide the FPS badge everywhere, live. */
export function setDevPerfVisible(visible: boolean): void {
  if (!__DEV__) return;
  devPerfVisible = visible;
  for (const fn of listeners) fn(visible);
}

/** Dev-only: subscribe to visibility changes; returns an unsubscribe fn. */
export function subscribeDevPerf(fn: (visible: boolean) => void): () => void {
  if (!__DEV__) return () => {};
  listeners.add(fn);
  fn(devPerfVisible);
  return () => listeners.delete(fn);
}

export function DevPerfBadge() {
  const [visible, setVisible] = useState(devPerfVisible);
  useEffect(() => subscribeDevPerf(setVisible), []);
  const [fps, setFps] = useState<number | null>(null);
  const frames = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (!visible || !__DEV__) return;
    frames.current = 0;
    ticking.current = false;
    let raf = 0;
    let alive = true;

    const loop = () => {
      if (!alive) return;
      frames.current += 1;
      if (!ticking.current) {
        ticking.current = true;
        setTimeout(() => {
          if (!alive) return;
          setFps(frames.current);
          frames.current = 0;
          ticking.current = false;
        }, SAMPLE_MS);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [visible]);

  if (!__DEV__ || !visible) return null;

  return (
    <View style={styles.badge} pointerEvents="none">
      <Text style={styles.text}>{fps === null ? '—' : `${fps} FPS`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.round,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    opacity: 0.75,
  },
  text: {
    color: palette.success,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
});
