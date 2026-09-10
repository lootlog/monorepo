import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GameNpcWithLocation } from "@/store/npc-detector.store";

const NPC_ROW_EXIT_RETENTION_MS = 220;

type ExitingNpcRow = {
  index: number;
  npc: GameNpcWithLocation;
  startedAt: number;
};

type Options = {
  npcs: GameNpcWithLocation[] | undefined;
  startIndex: number;
  endIndex: number;
  animationEffectsEnabled: boolean;
};

export function useNpcListExitingRows({
  npcs,
  startIndex,
  endIndex,
  animationEffectsEnabled,
}: Options) {
  const [exitingNpcRows, setExitingNpcRows] = useState<ExitingNpcRow[]>([]);
  const previousNpcsRef = useRef(npcs ?? []);
  const previousVisibleRangeRef = useRef({ startIndex: 0, endIndex: 0 });
  useLayoutEffect(() => {
    const currentNpcIds = new Set((npcs ?? []).map((npc) => npc.id));
    const previousNpcs = previousNpcsRef.current;
    const previousVisibleRange = previousVisibleRangeRef.current;

    const removedVisibleNpcs = previousNpcs.flatMap((npc, index) =>
      index >= previousVisibleRange.startIndex &&
      index < previousVisibleRange.endIndex &&
      !currentNpcIds.has(npc.id)
        ? [{ index, npc }]
        : [],
    );

    setExitingNpcRows((currentRows) => {
      if (!animationEffectsEnabled) {
        return currentRows.length === 0 ? currentRows : [];
      }

      const retainedRows = currentRows.filter(
        (row) => !currentNpcIds.has(row.npc.id),
      );

      let changed = retainedRows.length !== currentRows.length;
      const retainedNpcIds = new Set(retainedRows.map((row) => row.npc.id));

      for (const removedRow of removedVisibleNpcs) {
        if (retainedNpcIds.has(removedRow.npc.id)) continue;

        retainedRows.push({ ...removedRow, startedAt: Date.now() });
        retainedNpcIds.add(removedRow.npc.id);
        changed = true;
      }

      return changed ? retainedRows : currentRows;
    });

    previousNpcsRef.current = npcs ?? [];
    previousVisibleRangeRef.current = { startIndex, endIndex };
  }, [animationEffectsEnabled, endIndex, npcs, startIndex]);

  useEffect(() => {
    if (exitingNpcRows.length === 0) return;

    const nearestExpiryAt = Math.min(
      ...exitingNpcRows.map((row) => row.startedAt + NPC_ROW_EXIT_RETENTION_MS),
    );

    const timeoutId = window.setTimeout(
      () => {
        const now = Date.now();
        setExitingNpcRows((currentRows) =>
          currentRows.filter(
            (row) => now - row.startedAt < NPC_ROW_EXIT_RETENTION_MS,
          ),
        );
      },
      Math.max(0, nearestExpiryAt - Date.now()),
    );

    return () => window.clearTimeout(timeoutId);
  }, [exitingNpcRows]);

  return { exitingNpcRows, setExitingNpcRows };
}
