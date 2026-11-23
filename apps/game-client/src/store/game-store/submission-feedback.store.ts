import { create } from "zustand";

export type SubmissionKind = "loot" | "kill";

export type SubmissionOutcome = "logged" | "failed";

export type SubmissionFeedback = {
  readonly sequence: number;
  readonly kind: SubmissionKind;
  readonly outcome: SubmissionOutcome;
};

type SubmissionFeedbackState = {
  latest: SubmissionFeedback | null;
};

export const useSubmissionFeedbackStore = create<SubmissionFeedbackState>(
  () => ({ latest: null }),
);

export const reportSubmissionOutcome = (
  kind: SubmissionKind,
  outcome: SubmissionOutcome,
): void => {
  try {
    useSubmissionFeedbackStore.setState(({ latest }) => ({
      latest: { sequence: (latest?.sequence ?? 0) + 1, kind, outcome },
    }));
  } catch (error) {
    console.warn("[SubmissionFeedback] Failed to report outcome:", error);
  }
};
