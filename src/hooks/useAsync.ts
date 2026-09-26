import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/**
 * Minimal async data hook: runs `fn`, exposes data/loading/error and a
 * `reload` used after mutations. (TanStack Query replaces this in Phase 7
 * when server state joins local state — call sites keep the same shape.)
 *
 * `loading` is true only until the first fetch settles; later reloads keep
 * the previous data visible instead of flashing a spinner.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const loading = data === null && error === null;

  // Keep the latest fn without re-running the fetch on every render.
  // The ref is written inside an effect (never during render).
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    let alive = true;
    fnRef
      .current()
      .then((result) => {
        if (!alive) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
