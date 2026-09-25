/**
 * Original motivational quotes (written for this app — no third-party IP).
 * Selection logic lives in the challenge/quote repository helpers.
 */

export interface Quote {
  text: string;
  author: string;
  category: 'discipline' | 'growth' | 'courage' | 'patience';
}

export const QUOTES: Quote[] = [
  { text: 'The body achieves what the mind believes. Train both.', author: 'DragonQuest', category: 'growth' },
  { text: 'Small disciplines repeated daily outweigh grand intentions.', author: 'DragonQuest', category: 'discipline' },
  { text: 'A river cuts stone not by power, but by showing up daily.', author: 'DragonQuest', category: 'patience' },
  { text: 'You are not behind. You are exactly one decision from back on track.', author: 'DragonQuest', category: 'courage' },
  { text: 'Comfort is the quiet thief of potential.', author: 'DragonQuest', category: 'discipline' },
  { text: 'Every rep is a vote for the person you are becoming.', author: 'DragonQuest', category: 'growth' },
  { text: 'The hard days count double — they are the ones that change you.', author: 'DragonQuest', category: 'courage' },
  { text: 'Do not break the chain. Paint every link.', author: 'DragonQuest', category: 'discipline' },
  { text: 'Talent is a rumour. Consistency is proof.', author: 'DragonQuest', category: 'discipline' },
  { text: 'Grow at the pace of honesty, not the pace of pressure.', author: 'DragonQuest', category: 'patience' },
  { text: 'Your future self is watching. Give them something to smile about.', author: 'DragonQuest', category: 'growth' },
  { text: 'Start ugly. Improve loudly. Finish proud.', author: 'DragonQuest', category: 'courage' },
];
