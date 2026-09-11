import type { SettingsSaveBadgeStatus } from "@/components/settings/settings-save-badge";
import { useEffect, useState } from "react";

const RESOLVED_VISIBLE_MS = 1500;

export type SaveMark = { status: SettingsSaveBadgeStatus; at: number };

/**
 * Per-item save marks for badges on cards or rows. "saving" stays until the
 * write resolves; "saved" and "error" clear themselves after a moment.
 */
export const useSaveMarks = () => {
  const [marks, setMarks] = useState<Record<string, SaveMark>>({});

  const mark = (ids: readonly string[], status: SettingsSaveBadgeStatus) => {
    const at = Date.now();

    setMarks((current) => {
      const next = { ...current };
      ids.forEach((id) => {
        next[id] = { status, at };
      });

      return next;
    });
  };

  const nextExpiry = Object.values(marks).reduce<number | null>(
    (soonest, { status, at }) => {
      if (status === "saving") return soonest;
      const expiry = at + RESOLVED_VISIBLE_MS;

      return soonest === null || expiry < soonest ? expiry : soonest;
    },
    null,
  );

  useEffect(() => {
    if (nextExpiry === null) return;

    const timeoutId = window.setTimeout(
      () => {
        const now = Date.now();

        setMarks((current) =>
          Object.fromEntries(
            Object.entries(current).filter(
              ([, { status, at }]) =>
                status === "saving" || at + RESOLVED_VISIBLE_MS > now,
            ),
          ),
        );
      },
      Math.max(0, nextExpiry - Date.now()),
    );

    return () => window.clearTimeout(timeoutId);
  }, [nextExpiry]);

  return { marks, mark };
};
