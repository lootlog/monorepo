import { useEffect, useState } from "react";
import { useSubmissionFeedbackStore } from "@/store/game-store/submission-feedback.store";

const FEEDBACK_VISIBLE_MS = 1_200;

export const useSubmissionFeedback = () => {
  const latest = useSubmissionFeedbackStore((state) => state.latest);
  const latestSequence = latest?.sequence ?? 0;
  const [mountSequence] = useState(latestSequence);
  const [expiredSequence, setExpiredSequence] = useState(latestSequence);

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- timer that expires the visible submission feedback
  useEffect(() => {
    if (latestSequence <= expiredSequence) return;

    const timeoutId = window.setTimeout(
      () => setExpiredSequence(latestSequence),
      FEEDBACK_VISIBLE_MS,
    );

    return () => window.clearTimeout(timeoutId);
  }, [expiredSequence, latestSequence]);

  return {
    visible: latestSequence > expiredSequence ? latest : null,
    signalCount: latestSequence - mountSequence,
  };
};
