import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { APP_NAME, APP_TAGLINE } from '@/constants';

import { springPresets } from '../motion';
import { palette, radius, spacing } from '../tokens';
import { ThemedText } from './ThemedText';

/**
 * SplashGate — bridges the native splash to the app's first animated frame.
 *
 * Sequence: hold the native splash → play the "aura ignition" intro (pulsing
 * ember + title rise) → hide native splash and mount children behind a
 * fading void overlay. Sequencing happens on the JS thread (setTimeout);
 * only visual values animate on the UI thread.
 */

const INTRO_MS = 1500; // ember ignite + pulse + title rise
const FADE_MS = 280; // overlay fade-out after intro

export function SplashGate({ children }: { children: React.ReactNode }) {
  // Phase 1: intro playing (children not mounted)
  // Phase 2: children mounted, fade overlay on top
  // Phase 3: overlay removed
  const [phase, setPhase] = useState<1 | 2 | 3>(1);

  const emberScale = useSharedValue(0.6);
  const emberOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(18);
  const titleOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => {});

    // Ignition: ember flares in, pulses twice, settles.
    emberOpacity.value = withTiming(1, { duration: 250 });
    emberScale.value = withSequence(
      withSpring(1, springPresets.impact),
      withRepeat(
        withSequence(withSpring(1.12, springPresets.snappy), withSpring(0.96, springPresets.snappy)),
        2,
        true
      ),
      withSpring(1, springPresets.snappy)
    );
    // Title rises in after the ember ignites.
    titleOpacity.value = withDelay(500, withTiming(1, { duration: 350 }));
    titleTranslateY.value = withDelay(500, withSpring(0, springPresets.pop));

    const introTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      setPhase(2);
      overlayOpacity.value = withTiming(0, { duration: FADE_MS });
    }, INTRO_MS);

    const fadeTimer = setTimeout(() => setPhase(3), INTRO_MS + FADE_MS + 50);

    return () => {
      clearTimeout(introTimer);
      clearTimeout(fadeTimer);
    };
  }, [emberOpacity, emberScale, titleOpacity, titleTranslateY, overlayOpacity]);

  const emberStyle = useAnimatedStyle(() => ({
    opacity: emberOpacity.value,
    transform: [{ scale: emberScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  return (
    <View style={styles.root}>
      {phase !== 1 ? children : null}

      {phase === 1 ? (
        <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
          <View style={styles.center}>
            <Animated.View style={[styles.emberWrap, emberStyle]}>
              <View style={styles.emberCore} />
              <View style={styles.emberHalo} />
            </Animated.View>
            <Animated.View style={[styles.titleBlock, titleStyle]}>
              <ThemedText variant="display" color="textBright" style={styles.title}>
                {APP_NAME}
              </ThemedText>
              <ThemedText variant="label" color="textDim">
                {APP_TAGLINE}
              </ThemedText>
            </Animated.View>
          </View>
        </View>
      ) : null}

      {phase === 2 ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.backdrop, overlayStyle]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: palette.void,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emberWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emberCore: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: radius.round,
    backgroundColor: palette.aura,
    shadowColor: palette.aura,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  emberHalo: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: radius.round,
    borderWidth: 2,
    borderColor: palette.auraDim,
  },
  titleBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    letterSpacing: 2,
  },
});
