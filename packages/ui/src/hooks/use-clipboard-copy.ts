import { useEffect, useState } from "react";

export type ClipboardCopyState = "idle" | "copying" | "copied" | "failed";

const FEEDBACK_SHOWN_MS = 2000;

export function useClipboardCopy() {
  const [state, setState] = useState<ClipboardCopyState>("idle");

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- timer that returns copy feedback to idle
  useEffect(() => {
    if (state !== "copied" && state !== "failed") return;

    const timeout = setTimeout(() => setState("idle"), FEEDBACK_SHOWN_MS);

    return () => clearTimeout(timeout);
  }, [state]);

  const copyWith = async (write: () => Promise<void>) => {
    setState("copying");

    try {
      await write();
      setState("copied");

      return true;
    } catch {
      setState("failed");

      return false;
    }
  };

  const copy = (text: string) =>
    copyWith(() => navigator.clipboard.writeText(text));

  return { state, copy, copyWith };
}
