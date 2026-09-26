import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { radius } from '../tokens';

type Stage = 'ember' | 'aura' | 'gold';

interface CharacterAvatarProps {
  /** Avatar diameter in px. */
  size?: number;
  /** Visual stage — grows with the character's rank (swappable for artwork). */
  stage?: Stage;
}

/**
 * CharacterAvatar — the hero's ORIGINAL anime-inspired figure, drawn entirely
 * with views (no external asset dependency): a spiky-haired training-camp
 * silhouette inside a glowing aura disc with an energy flare behind the head.
 * The shape language (spikes, band, flare) reads "anime protagonist" without
 * resembling any licensed character. Swap the internals for original artwork
 * later — every call site stays unchanged.
 */
export function CharacterAvatar({ size = 96, stage = 'aura' }: CharacterAvatarProps) {
  const stages: Record<
    Stage,
    { top: string; bottom: string; figure: string; hair: string; ring: string; flare: string }
  > = {
    ember: {
      top: '#FF8C42',
      bottom: '#7A2E0E',
      figure: '#1A0D06',
      hair: '#2B1408',
      ring: '#FF6B35',
      flare: 'rgba(255, 140, 66, 0.35)',
    },
    aura: {
      top: '#66F0FF',
      bottom: '#0B4A56',
      figure: '#04252C',
      hair: '#063540',
      ring: '#00E5FF',
      flare: 'rgba(0, 229, 255, 0.30)',
    },
    gold: {
      top: '#FFE3A3',
      bottom: '#4A3A12',
      figure: '#1F1606',
      hair: '#2B2008',
      ring: '#FFC94D',
      flare: 'rgba(255, 201, 77, 0.32)',
    },
  };
  const s = stages[stage];

  const ring = Math.max(2, Math.round(size * 0.04));
  const head = size * 0.3;
  const bodyW = size * 0.48;
  const bodyH = size * 0.3;
  const spikeW = head * 0.42;
  const spikeH = head * 0.5;

  const spike = (rotate: number, dx: number, scale: number) => ({
    width: spikeW,
    height: spikeH * scale,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderLeftWidth: spikeW / 2,
    borderRightWidth: spikeW / 2,
    borderBottomWidth: spikeH * scale,
    borderBottomColor: s.hair,
    transform: [{ rotate: `${rotate}deg` }, { translateX: dx }],
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* Aura disc */}
      <LinearGradient
        colors={[s.top, s.bottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[
          styles.disc,
          { width: size - ring * 2, height: size - ring * 2, borderRadius: radius.round },
        ]}
      />
      {/* Energy flare behind the head */}
      <View
        style={[
          styles.flare,
          {
            width: size * 0.52,
            height: size * 0.52,
            borderRadius: radius.round,
            backgroundColor: s.flare,
            top: size * 0.12,
          },
        ]}
      />
      {/* Figure anchored to the bottom of the disc */}
      <View style={[styles.figure, { paddingBottom: size * 0.1 }]}>
        <View style={styles.hair}>
          <View style={spike(-24, -spikeW * 0.55, 1)} />
          <View style={spike(0, 0, 1.18)} />
          <View style={spike(24, spikeW * 0.55, 1)} />
        </View>
        {/* Head */}
        <View
          style={{
            width: head,
            height: head,
            borderRadius: radius.round,
            backgroundColor: s.figure,
          }}
        />
        {/* Shoulders */}
        <View
          style={{
            width: bodyW,
            height: bodyH,
            borderTopLeftRadius: bodyW / 2,
            borderTopRightRadius: bodyW / 2,
            backgroundColor: s.figure,
            marginTop: size * 0.02,
          }}
        />
        {/* Headband — training-camp accent across the shoulders */}
        <View
          style={[
            styles.band,
            {
              width: bodyW * 0.9,
              height: Math.max(2, size * 0.022),
              borderRadius: radius.round,
              backgroundColor: s.ring,
            },
          ]}
        />
      </View>
      {/* Aura ring */}
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: radius.round,
            borderWidth: ring,
            borderColor: s.ring,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    position: 'absolute',
  },
  flare: {
    position: 'absolute',
  },
  figure: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: -6,
  },
  band: {
    position: 'absolute',
    bottom: '18%',
  },
  ring: {
    position: 'absolute',
    opacity: 0.9,
  },
});
