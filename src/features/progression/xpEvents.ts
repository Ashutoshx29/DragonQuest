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

// ── Board refresh events ──────────────────────────────────────────────────
// Completing a mission/objective from ANY screen (Home, Mission Board,
// Training) must instantly update every other view of the same data.
// Mutators fire notifyBoardChanged(); views subscribe with onBoardChanged().

const boardListeners = new Set<Listener>();

export function notifyBoardChanged(): void {
  for (const listener of boardListeners) {
    try {
      listener();
    } catch {
      // a broken listener must never break the mutator
    }
  }
}

export function onBoardChanged(listener: Listener): () => void {
  boardListeners.add(listener);
  return () => {
    boardListeners.delete(listener);
  };
}
