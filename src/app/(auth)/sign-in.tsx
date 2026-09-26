import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Button, CharacterAvatar, Input, Screen, ThemedText } from '@/design-system/components';
import { gradients, radius, spacing } from '@/design-system/tokens';
import { useAuth } from '@/features/auth/AuthProvider';

type Mode = 'sign-in' | 'sign-up';

/**
 * Account entry — reached from Profile → Account. Local-only usage remains
 * the default experience; this screen exists for users who want their
 * progress to travel across devices.
 */
export default function SignInScreen() {
  const router = useRouter();
  const { signInWithPassword, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'sign-in') {
        const { error: err } = await signInWithPassword(email.trim(), password);
        if (err) setError(err);
        else router.back();
      } else {
        const { error: err, needsConfirmation } = await signUp(email.trim(), password);
        if (err) setError(err);
        else if (needsConfirmation) setConfirmationSent(true);
        else router.back();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={[gradients.heroAccent[0], gradients.heroAccent[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <CharacterAvatar size={72} stage="aura" />
          <ThemedText variant="title" color="textBright">
            DragonQuest
          </ThemedText>
          <ThemedText variant="caption" color="textDim">
            Your progress travels with you
          </ThemedText>
        </LinearGradient>

        {confirmationSent ? (
          <View style={styles.card}>
            <ThemedText variant="subheading" color="textBright">
              Confirm your email
            </ThemedText>
            <ThemedText variant="body" color="textDim">
              We sent a confirmation link to {email.trim()}. Confirm it, then sign in here.
            </ThemedText>
            <Button label="Back to sign in" variant="secondary" onPress={() => setMode('sign-in')} />
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.modeRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMode('sign-in')}
                style={[styles.modeBtn, mode === 'sign-in' && styles.modeBtnActive]}
              >
                <ThemedText variant="label" color={mode === 'sign-in' ? 'accent' : 'textDim'}>
                  SIGN IN
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMode('sign-up')}
                style={[styles.modeBtn, mode === 'sign-up' && styles.modeBtnActive]}
              >
                <ThemedText variant="label" color={mode === 'sign-up' ? 'accent' : 'textDim'}>
                  CREATE ACCOUNT
                </ThemedText>
              </Pressable>
            </View>

            <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />

            {error ? <ThemedText variant="caption" color="danger">{error}</ThemedText> : null}

            <Button
              label={mode === 'sign-in' ? 'Sign in' : 'Create account'}
              onPress={() => void submit()}
              loading={busy}
            />
            <ThemedText variant="caption" color="textFaint">
              Everything already works offline. An account only syncs your progress across devices.
            </ThemedText>
          </View>
        )}

        <Button label="Not now" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#1E3242',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#232837',
    backgroundColor: 'rgba(18, 21, 29, 0.6)',
    padding: spacing.xl,
    gap: spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeBtnActive: {
    borderColor: '#1E3242',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
});
