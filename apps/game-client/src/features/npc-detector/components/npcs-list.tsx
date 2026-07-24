import { ScrollArea } from "@/components/ui/scroll-area";
import { NpcListItem } from "@/features/npc-detector/components/npc-list-item";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useSettingsStore } from "@/store/settings.store";
import { type FC, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DetectorSettings, NpcTypeColors } from "@lootlog/types";
import { usePartyGatheringOrchestration } from "@/features/party-finder/hooks/use-party-gathering-orchestration";
import {
  selectOwnedReadyRoom,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { useShallow } from "zustand/react/shallow";
import { useNpcListLifecycle } from "@/features/npc-detector/hooks/use-npc-list-lifecycle";

type NpcsListProps = {
  detectorSettings: DetectorSettings;
  npcs?: GameNpcWithLocation[];
  npcTypeColors?: NpcTypeColors;
};

const NPC_ROW_HEIGHT_PX = 50;
const NPC_ROW_GAP_PX = 4;
const NPC_LIST_PADDING_TOP_PX = 4;
const NPC_ROW_STRIDE_PX = NPC_ROW_HEIGHT_PX + NPC_ROW_GAP_PX;
const NPC_LIST_OVERSCAN = 4;
const NPC_LIST_FALLBACK_HEIGHT_PX = 320;
const NPC_ROW_EXIT_RETENTION_MS = 220;

type NpcListViewport = {
  height: number;
  scrollTop: number;
};

type ExitingNpcRow = {
  index: number;
  npc: GameNpcWithLocation;
  startedAt: number;
};

export const NpcsList: FC<NpcsListProps> = ({
  detectorSettings,
  npcTypeColors,
  npcs,
}) => {
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const listContentRef = useRef<HTMLDivElement | null>(null);
  const rowLayoutAnimationsRef = useRef(new Map<number, Animation>());
  const previousNpcIndexByIdRef = useRef(
    new Map((npcs ?? []).map((npc, index) => [npc.id, index])),
  );
  const [viewport, setViewport] = useState<NpcListViewport>({
    height: NPC_LIST_FALLBACK_HEIGHT_PX,
    scrollTop: 0,
  });
  const [exitingNpcRows, setExitingNpcRows] = useState<ExitingNpcRow[]>([]);
  const previousNpcsRef = useRef(npcs ?? []);
  const previousVisibleRangeRef = useRef({ startIndex: 0, endIndex: 0 });
  const {
    activeDetectionAnimations,
    clearDetectionAnimation,
    hasMultipleNpcs,
    latestDetectionAnimationCycle,
    removeNpc,
    setNpcState,
    setNpcStates,
  } = useNpcDetectorStore(
    useShallow((state) => ({
      activeDetectionAnimations: state.activeDetectionAnimations,
      clearDetectionAnimation: state.clearDetectionAnimation,
      hasMultipleNpcs: state.npcs.length > 1,
      latestDetectionAnimationCycle: state.latestDetectionAnimationCycle,
      removeNpc: state.removeNpc,
      setNpcState: state.setNpcState,
      setNpcStates: state.setNpcStates,
    })),
  );
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );
  const hasActivePartyGathering = usePartyFinderStore(
    (state) => selectOwnedReadyRoom(state) !== null,
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const orchestration = usePartyGatheringOrchestration();
  const { currentTimeMs, notificationDeadlineByNpcId } = useNpcListLifecycle({
    activeDetectionAnimations,
    clearDetectionAnimation,
    npcs: npcs ?? [],
    setNpcStates,
  });

  useLayoutEffect(() => {
    const scrollViewport = scrollViewportRef.current;
    if (!scrollViewport) return;

    const updateViewport = () => {
      const nextHeight = scrollViewport.clientHeight;
      const nextScrollTop = scrollViewport.scrollTop;

      setViewport((currentViewport) => {
        if (
          currentViewport.height === nextHeight &&
          currentViewport.scrollTop === nextScrollTop
        ) {
          return currentViewport;
        }

        return {
          height: nextHeight,
          scrollTop: nextScrollTop,
        };
      });
    };

    updateViewport();
    scrollViewport.addEventListener("scroll", updateViewport, {
      passive: true,
    });

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateViewport);
    resizeObserver?.observe(scrollViewport);

    if (!resizeObserver) {
      window.addEventListener("resize", updateViewport);
    }

    return () => {
      scrollViewport.removeEventListener("scroll", updateViewport);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useLayoutEffect(() => {
    if (latestDetectionAnimationCycle === 0) return;
    scrollViewportRef.current?.scrollTo({
      top: 0,
      behavior: animationEffectsEnabled ? "smooth" : "auto",
    });
    setViewport((currentViewport) =>
      currentViewport.scrollTop === 0
        ? currentViewport
        : { ...currentViewport, scrollTop: 0 },
    );
  }, [animationEffectsEnabled, latestDetectionAnimationCycle]);

  const itemCount = npcs?.length ?? 0;
  const viewportHeight = viewport.height || NPC_LIST_FALLBACK_HEIGHT_PX;
  const firstVisibleIndex =
    itemCount === 0
      ? 0
      : Math.min(
          itemCount - 1,
          Math.max(
            0,
            Math.floor(
              (viewport.scrollTop - NPC_LIST_PADDING_TOP_PX) /
                NPC_ROW_STRIDE_PX,
            ),
          ),
        );
  const visibleItemCount = Math.ceil(viewportHeight / NPC_ROW_STRIDE_PX) + 1;
  const startIndex = Math.max(0, firstVisibleIndex - NPC_LIST_OVERSCAN);
  const endIndex = Math.min(
    itemCount,
    firstVisibleIndex + visibleItemCount + NPC_LIST_OVERSCAN,
  );
  const totalHeight =
    itemCount === 0
      ? 0
      : NPC_LIST_PADDING_TOP_PX +
        itemCount * NPC_ROW_STRIDE_PX -
        NPC_ROW_GAP_PX;
  const visibleNpcs = npcs?.slice(startIndex, endIndex) ?? [];

  useLayoutEffect(() => {
    const currentNpcIds = new Set((npcs ?? []).map((npc) => npc.id));
    const previousNpcs = previousNpcsRef.current;
    const previousVisibleRange = previousVisibleRangeRef.current;
    const removedVisibleNpcs = previousNpcs
      .map((npc, index) => ({ index, npc }))
      .filter(
        ({ index, npc }) =>
          index >= previousVisibleRange.startIndex &&
          index < previousVisibleRange.endIndex &&
          !currentNpcIds.has(npc.id),
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

  useLayoutEffect(() => {
    const currentNpcIndexById = new Map(
      (npcs ?? []).map((npc, index) => [npc.id, index]),
    );
    const rowLayoutAnimations = rowLayoutAnimationsRef.current;

    for (const [npcId, animation] of rowLayoutAnimations) {
      if (!animationEffectsEnabled || !currentNpcIndexById.has(npcId)) {
        animation.cancel();
        rowLayoutAnimations.delete(npcId);
      }
    }

    const listContent = listContentRef.current;
    if (animationEffectsEnabled && listContent) {
      (npcs ?? []).slice(startIndex, endIndex).forEach((npc, visibleIndex) => {
        const previousIndex = previousNpcIndexByIdRef.current.get(npc.id);
        const currentIndex = startIndex + visibleIndex;
        if (previousIndex === undefined || previousIndex === currentIndex) {
          return;
        }

        const rowElement = listContent.querySelector<HTMLElement>(
          `[data-ll-npc-row-id="${npc.id}"]`,
        );
        if (!rowElement || typeof rowElement.animate !== "function") {
          return;
        }

        rowLayoutAnimations.get(npc.id)?.cancel();
        const translateY = (previousIndex - currentIndex) * NPC_ROW_STRIDE_PX;
        const animation = rowElement.animate(
          [
            { transform: `translateY(${translateY}px)` },
            { transform: "translateY(0)" },
          ],
          {
            duration: 180,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          },
        );
        rowLayoutAnimations.set(npc.id, animation);
        const clearAnimation = () => {
          if (rowLayoutAnimations.get(npc.id) === animation) {
            rowLayoutAnimations.delete(npc.id);
          }
        };
        animation.oncancel = clearAnimation;
        animation.onfinish = clearAnimation;
      });
    }

    previousNpcIndexByIdRef.current = currentNpcIndexById;
  }, [animationEffectsEnabled, endIndex, npcs, startIndex]);

  useLayoutEffect(
    () => () => {
      rowLayoutAnimationsRef.current.forEach((animation) => {
        animation.cancel();
      });
      rowLayoutAnimationsRef.current.clear();
    },
    [],
  );

  const renderedTotalHeight = Math.max(
    totalHeight,
    ...exitingNpcRows.map(
      (row) =>
        NPC_LIST_PADDING_TOP_PX +
        row.index * NPC_ROW_STRIDE_PX +
        NPC_ROW_HEIGHT_PX,
    ),
  );

  return (
    <ScrollArea
      ref={scrollViewportRef}
      className="ll:w-full ll:box-border ll:h-full"
    >
      <div
        ref={listContentRef}
        className="ll:relative ll:w-full"
        role="list"
        style={{ height: renderedTotalHeight }}
      >
        {visibleNpcs.map((npc, visibleIndex) => {
          const npcIndex = startIndex + visibleIndex;

          return (
            <div
              key={npc.id}
              data-ll-npc-row-id={npc.id}
              aria-posinset={npcIndex + 1}
              aria-setsize={itemCount}
              role="listitem"
              className="ll-npc-list-row ll:absolute ll:left-0 ll:w-full"
              style={{
                height: NPC_ROW_HEIGHT_PX,
                top: NPC_LIST_PADDING_TOP_PX + npcIndex * NPC_ROW_STRIDE_PX,
              }}
            >
              <NpcListItem
                npcTypeColors={npcTypeColors}
                animationEffectsEnabled={animationEffectsEnabled}
                npc={npc}
                detectionAnimationCycle={
                  activeDetectionAnimations[npc.id] ?? null
                }
                notificationCooldownCurrentTimeMs={currentTimeMs}
                notificationCooldownEndsAt={
                  notificationDeadlineByNpcId.get(npc.id) ?? null
                }
                detectorSettings={detectorSettings}
                hasActivePartyGathering={hasActivePartyGathering}
                hasMultipleNpcs={hasMultipleNpcs}
                orchestration={orchestration}
                removeNpc={removeNpc}
                setNpcState={setNpcState}
                setOpen={setOpen}
              />
            </div>
          );
        })}
        {exitingNpcRows.map(({ index, npc, startedAt }) => (
          <div
            key={`exiting-${npc.id}-${startedAt}`}
            aria-hidden="true"
            className="ll:pointer-events-none ll:absolute ll:left-0 ll:w-full ll:animate-out ll:fade-out-0 ll:slide-out-to-top-3 ll:zoom-out-95 ll:duration-200"
            style={{
              height: NPC_ROW_HEIGHT_PX,
              top: NPC_LIST_PADDING_TOP_PX + index * NPC_ROW_STRIDE_PX,
            }}
            onAnimationEnd={(event) => {
              if (event.currentTarget !== event.target) return;
              setExitingNpcRows((currentRows) =>
                currentRows.filter(
                  (row) => row.npc.id !== npc.id || row.startedAt !== startedAt,
                ),
              );
            }}
          >
            <NpcListItem
              npcTypeColors={npcTypeColors}
              animationEffectsEnabled={animationEffectsEnabled}
              npc={npc}
              detectionAnimationCycle={null}
              notificationCooldownCurrentTimeMs={currentTimeMs}
              notificationCooldownEndsAt={
                notificationDeadlineByNpcId.get(npc.id) ?? null
              }
              detectorSettings={detectorSettings}
              hasActivePartyGathering={hasActivePartyGathering}
              hasMultipleNpcs={hasMultipleNpcs}
              orchestration={orchestration}
              removeNpc={removeNpc}
              setNpcState={setNpcState}
              setOpen={setOpen}
            />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
