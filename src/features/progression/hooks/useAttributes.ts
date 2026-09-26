import { useEffect } from 'react';

import { getAttributeViews } from '@/data/repositories';
import { useAsync } from '@/hooks/useAsync';
import type { AttributeViews } from '@/game/engine/attributes';
import { onXpChanged } from '../xpEvents';

/**
 * Derived attribute views (POWER / FOCUS / DISCIPLINE / MIND / ENERGY).
 * Recomputes whenever the XP ledger changes so any reward, mission claim or
 * training session instantly moves the right attribute.
 */
export function useAttributes(): AttributeViews | null {
  const { data, reload } = useAsync(() => getAttributeViews(), []);

  useEffect(() => {
    const unsubscribe = onXpChanged(() => reload());
    return unsubscribe;
  }, [reload]);

  return (data ?? null) as AttributeViews | null;
}
