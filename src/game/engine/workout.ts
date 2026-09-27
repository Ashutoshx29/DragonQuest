/**
 * Physical workout logging utilities (pure engine).
 */

export interface WorkoutDraft {
  title?: string | null;
  sets?: string | null;
  reps?: string | null;
  notes?: string | null;
}

/**
 * Returns true if any field of the workout draft contains non-whitespace text.
 */
export function hasWorkoutInput(draft: WorkoutDraft): boolean {
  return Boolean(
    (draft.title && draft.title.trim().length > 0) ||
    (draft.sets && draft.sets.trim().length > 0) ||
    (draft.reps && draft.reps.trim().length > 0) ||
    (draft.notes && draft.notes.trim().length > 0)
  );
}
