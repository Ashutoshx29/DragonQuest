import { ScrollView, StyleSheet, View } from 'react-native';

import { palette, radius, spacing } from '@/design-system/tokens';
import { ThemedText } from '@/design-system/components';

/**
 * HOW DRAGONQUEST WORKS — help content rendered inside a bottom Sheet.
 * User language only: what a thing is, how to use it, what earns XP.
 * Sections scroll on small phones (the Sheet caps at 90% height).
 */

const SECTIONS: { title: string; body: string[]; xp?: string }[] = [
  {
    title: 'Home',
    body: ['Your daily command center. Check in, see your character, and claim today\'s missions.'],
    xp: 'Claiming a mission: +50 XP. All three: bonus chest +75 XP.',
  },
  {
    title: 'Training',
    body: ['The dojo. It recommends what to train next — Focus, Mind, Physical, or Recovery — and keeps a log of today\'s sessions.'],
  },
  {
    title: 'Focus training',
    body: ['Timed deep-work sessions. Pick a length from 5 to 90 minutes, then start the countdown. You can finish early and keep partial XP, or minimize the timer and keep training in the background.'],
    xp: '6 XP per minute trained (Focus XP).',
  },
  {
    title: 'Physical training',
    body: ['Log a real workout — a name plus optional sets, reps, and notes.'],
    xp: 'Flat +50 XP per logged workout (Power XP).',
  },
  {
    title: 'Mind training',
    body: ['Short meditation sessions, same timer as Focus.'],
    xp: '6 XP per minute (Mind XP).',
  },
  {
    title: 'Recovery / Breathing',
    body: ['Guided breathing: Calm, Box, or Coherent patterns, offered after focus sessions or anytime.'],
    xp: '6 XP per minute (Energy XP).',
  },
  {
    title: 'Missions',
    body: ['The Mission Board holds Missions (habits you repeat), Objectives (one-off tasks), Rituals (routines), and Grand Quests (long goals with milestones). Three daily missions refresh every day.'],
    xp: 'Habits, tasks and routines pay XP by difficulty (harder = more).',
  },
  {
    title: 'Journal',
    body: ['A two-minute daily reflection: rate your Mood, Energy and Discipline, then write what happened and what you learned. One entry per day — editing it never loses the reward.'],
    xp: 'First save each day: +30 XP (Mind).',
  },
  {
    title: 'Progress',
    body: ['Charts, your five attribute cards, and how your training adds up over the week.'],
  },
  {
    title: 'Profile',
    body: ['Your character sheet: avatar, rank, records, medals, account and sign out. Tap the brush on your avatar to change it.'],
  },
  {
    title: 'XP & Levels',
    body: ['Everything you do earns XP. Levels rise on a curve, and your rank title grows with them: Initiate, Apprentice, Adept… all the way to Transcendent.'],
  },
  {
    title: 'Attributes',
    body: ['Five stats grow from what you actually do: Power from workouts, Focus from deep work and tasks, Discipline from habits and missions, Mind from training and journaling, Energy from recovery and rituals.'],
  },
  {
    title: 'Streaks',
    body: ['Train something every day to keep your streak. Longer streaks multiply the XP you earn — and missing days resets it.'],
  },
  {
    title: 'Achievements & Medals',
    body: ['Milestones like your first session, week-long streaks, and journal habits unlock medals on your Profile.'],
  },
];

export function HelpContent() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
      accessibilityLabel="How DragonQuest works"
    >
      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <ThemedText variant="subheading" color="textBright">
            {section.title}
          </ThemedText>
          {section.body.map((paragraph, i) => (
            <ThemedText key={i} variant="body" color="textDim" style={styles.paragraph}>
              {paragraph}
            </ThemedText>
          ))}
          {section.xp ? (
            <View style={styles.xpRow}>
              <ThemedText variant="label" color="gold">
                {section.xp}
              </ThemedText>
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    // Inside the Sheet's auto-height panel (maxHeight 90%): natural height
    // when content fits, shrinks + scrolls when the 14 sections exceed the
    // panel on small phones. (flex:1 would collapse to 0 in an auto parent.)
    flexGrow: 0,
    flexShrink: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  section: {
    gap: spacing.xs,
  },
  paragraph: {
    lineHeight: 22,
  },
  xpRow: {
    alignSelf: 'flex-start',
    backgroundColor: palette.slate,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
