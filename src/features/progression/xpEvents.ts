/**
 * XP change pub/sub — the bridge between mutations (repos/hooks) and the
 * ProgressionProvider. Hooks call notifyXpChanged() after any XP-affecting
 * action; the provider refreshes totals and detects level-ups.
 *
 * Deliberately tiny. Phase 7 replaces the refresh source with TanStack
 * Query invalidation; call sites keep working unchanged.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function notifyXpChanged(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // a broken listener must never break the mutator
    }
  }
}

export function onXpChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
