import { formatDayLong } from '@/lib/dates';
import { resolveAvatarStage } from '@/game/config/avatar';

describe('formatDayLong', () => {
  // Locale-dependent by design — the assertion is the CONTRACT (readable in
  // the user's locale, never the raw storage shape), not one locale's output.
  it('renders a human-readable date in the runtime locale', () => {
    const out = formatDayLong('2026-09-27');
    expect(out).toContain('2026');
    expect(out).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('rejects invalid input', () => {
    expect(() => formatDayLong('not-a-day')).toThrow();
  });
});

describe('resolveAvatarStage', () => {
  it('a chosen stage always wins', () => {
    expect(resolveAvatarStage('ember', 30)).toBe('ember');
    expect(resolveAvatarStage('aura', 30)).toBe('aura');
    expect(resolveAvatarStage('gold', 1)).toBe('gold');
  });

  it('falls back to level: gold from 15, aura below', () => {
    expect(resolveAvatarStage(null, 15)).toBe('gold');
    expect(resolveAvatarStage(null, 14)).toBe('aura');
    expect(resolveAvatarStage(null, null)).toBe('aura');
  });

  it('ignores unknown stored values', () => {
    expect(resolveAvatarStage('', 5)).toBe('aura');
    expect(resolveAvatarStage('hacker', 20)).toBe('gold');
  });
});
