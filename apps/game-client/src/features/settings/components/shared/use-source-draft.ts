import { useState } from "react";

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
