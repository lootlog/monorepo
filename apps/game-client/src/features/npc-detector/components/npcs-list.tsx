import { useNpcListRowLayoutAnimation } from "@/features/npc-detector/hooks/use-npc-list-row-layout-animation";
import { useNpcListExitingRows } from "@/features/npc-detector/hooks/use-npc-list-exiting-rows";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NpcListItem } from "@/features/npc-detector/components/npc-list-item";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useSettingsStore } from "@/store/settings.store";
import { type FC, useLayoutEffect, useRef, useState } from "react";
import type { DetectorSettings } from "@lootlog/schema/account-preferences";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";
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

type NpcListViewport = {
  height: number;
  scrollTop: number;
};

export const NpcsList: FC<NpcsListProps> = ({
  detectorSettings,
  npcTypeColors,
  npcs,
}) => {
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const listContentRef = useRef<HTMLUListElement | null>(null);

  const [viewport, setViewport] = useState<NpcListViewport>({
    height: NPC_LIST_FALLBACK_HEIGHT_PX,
    scrollTop: 0,
  });

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

  const { exitingNpcRows, setExitingNpcRows } = useNpcListExitingRows({
    npcs,
    startIndex,
    endIndex,
    animationEffectsEnabled,
  });

  useNpcListRowLayoutAnimation({
    npcs,
    startIndex,
    endIndex,
    animationEffectsEnabled,
    listContentRef,
    rowStride: NPC_ROW_STRIDE_PX,
  });

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
      <ul
        ref={listContentRef}
        className="ll:relative ll:w-full ll:m-0 ll:p-0 ll:list-none"
        style={{ height: renderedTotalHeight }}
      >
        {visibleNpcs.map((npc, visibleIndex) => {
          const npcIndex = startIndex + visibleIndex;

          return (
            <li
              key={npc.id}
              data-ll-npc-row-id={npc.id}
              aria-posinset={npcIndex + 1}
              aria-setsize={itemCount}
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
            </li>
          );
        })}
        {exitingNpcRows.map(({ index, npc, startedAt }) => (
          <li
            key={`exiting-${npc.id}-${startedAt}`}
            aria-hidden="true"
            className="ll:pointer-events-none ll:absolute ll:left-0 ll:w-full ll:animate-out ll:fade-out-0 ll:slide-out-to-top-3 ll:zoom-out-95 ll:duration-200 ll:transition-none"
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
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
};
