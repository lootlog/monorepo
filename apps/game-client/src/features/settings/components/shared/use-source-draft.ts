import { useState } from "react";

/**
 * A local edit of a value owned elsewhere (a prop, the settings cache). The
 * draft applies only while the source it was made from is still current: a
 * new source, e.g. the saved value or a change from another device, replaces
 * it without an effect.
 */
export const useSourceDraft = <TSource, TValue>(
  source: TSource,
  committed: TValue,
) => {
  const [draft, setDraftState] = useState<{
    source: TSource;
    value: TValue;
  } | null>(null);

  const value =
    draft && Object.is(draft.source, source) ? draft.value : committed;

  const setDraft = (next: TValue) => setDraftState({ source, value: next });
  const clearDraft = () => setDraftState(null);

  return [value, setDraft, clearDraft] as const;
};
