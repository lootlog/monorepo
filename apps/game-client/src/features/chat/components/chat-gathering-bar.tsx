import { getSubtleBackgroundColor } from "@/utils/notifications-and-detector/background";
import {
  isCombatNpcType,
  type NpcTypeColors,
} from "@lootlog/schema/npc-appearance";
import { ChatAvailableGatherings } from "./chat-available-gatherings";
import { CHAT_GATHERING_ACTION_CLASS } from "../chat.constants";
import { ChatOwnGatheringBar } from "./chat-own-gathering-bar";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  partyReadyRoomControllerApply,
  type ActivePartyGatheringSummary,
} from "@lootlog/client/main";
import { decodePartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import {
  useActivePartyGatherings,
  ACTIVE_GATHERINGS_QUERY_KEY,
} from "@/features/chat/hooks/use-active-party-gatherings";
import {
  selectOwnedReadyRoom,
  selectReadyRoomForCharacter,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { useGameStore } from "@/store/game.store";
import { buildCurrentCharacterPayload } from "@/lib/api/generated-helpers";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { Button } from "@/components/ui/button";

export function selectFeaturedGathering(
  candidates: ActivePartyGatheringSummary[],
  frozen: ActivePartyGatheringSummary | null,
) {
  if (frozen)
    return (
      candidates.find(
        (candidate) => candidate.notificationId === frozen.notificationId,
      ) ?? null
    );
  return candidates[0] ?? null;
}

function getGatheringBackground(
  gathering: { npc?: { type?: string } } | null | undefined,
  colors?: NpcTypeColors,
) {
  const type = gathering?.npc?.type;
  return getSubtleBackgroundColor(
    isCombatNpcType(type) ? type : "party-gathering",
    colors,
  );
}

export function ChatGatheringBar({
  isVisible = true,
  npcTypeColors,
}: {
  isVisible?: boolean;
  npcTypeColors?: NpcTypeColors;
}) {
  const { t } = useTranslation("chat");
  const discovery = useActivePartyGatherings();
  const level = useGameStore((state) => state.game?.hero.level ?? 0);
  const identity = getCurrentReadyRoomCharacterIdentity();
  const room = usePartyFinderStore(
    (state) =>
      selectOwnedReadyRoom(state) ??
      selectReadyRoomForCharacter(state, identity),
  );
  const queryClient = useQueryClient();

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [frozen, setFrozen] = useState<ActivePartyGatheringSummary | null>(
    null,
  );
  const barRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const application = useMutation({
    mutationFn: (target: ActivePartyGatheringSummary) => {
      const character = buildCurrentCharacterPayload();
      if (!character || target.world !== useGameStore.getState().game?.world)
        throw new Error("Character changed");
      return partyReadyRoomControllerApply(
        { notificationId: target.notificationId },
        { world: target.world, character },
      );
    },
    onSuccess: (projection) =>
      usePartyFinderStore
        .getState()
        .mergeProjection(decodePartyReadyRoomProjection(projection)),
    onSettled: () => {
      pendingRef.current = false;
      void queryClient.invalidateQueries({
        queryKey: ACTIVE_GATHERINGS_QUERY_KEY,
      });
    },
  });
  const candidates = discovery.data.filter(
    (candidate) =>
      level >= (candidate.minLvl ?? 0) &&
      level <= (candidate.maxLvl ?? Infinity),
  );
  const newest = candidates[0] ?? null;
  const locked = hovered || focused || application.isPending;
  const target = selectFeaturedGathering(candidates, locked ? frozen : null);
  const apply = (candidate: ActivePartyGatheringSummary) => {
    if (pendingRef.current || room || discovery.isStale) return;
    pendingRef.current = true;
    setFrozen(candidate);
    application.mutate(candidate);
  };
  useEffect(() => {
    const join = () => {
      if (
        isVisible &&
        target &&
        barRef.current?.getClientRects().length &&
        !room
      )
        apply(target);
    };
    window.addEventListener("lootlog:join-visible-gathering", join);
    return () =>
      window.removeEventListener("lootlog:join-visible-gathering", join);
  });
  const hasError = discovery.isError;
  const {
    isError: applyError,
    variables: appliedTarget,
    reset: resetApplication,
  } = application;
  const applyFailed =
    applyError && appliedTarget.notificationId === target?.notificationId;
  useEffect(() => {
    if (applyError && appliedTarget.notificationId !== target?.notificationId)
      resetApplication();
  }, [applyError, appliedTarget, resetApplication, target?.notificationId]);
  if (!room && candidates.length === 0 && !hasError && !applyFailed)
    return null;
  return (
    <div
      ref={barRef}
      style={{
        backgroundColor: getGatheringBackground(room ?? target, npcTypeColors),
      }}
      className="ll:shrink-0 ll:border-solid ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40 ll:px-1.5 ll:py-1.5 ll:text-[11px] ll:leading-[14px] ll:[--ll-chat-detail-font-size:11px] ll:[--ll-chat-detail-line-height:14px] ll:text-gray-100"
      onMouseEnter={() => {
        setFrozen(target);
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => {
        if (!focused) setFrozen(target);
        setFocused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      {room ? (
        <ChatOwnGatheringBar key={room.notificationId} room={room} />
      ) : (
        <ChatAvailableGatherings
          candidates={candidates}
          target={target}
          locked={locked}
          pending={application.isPending}
          stale={discovery.isStale}
          onApply={apply}
          onShowLatest={() => setFrozen(newest)}
        />
      )}
      {applyFailed && (
        <p role="alert" className="ll:m-0 ll:text-amber-200">
          {t("gatherings.applyFailed")}
        </p>
      )}
      {discovery.isStale ? (
        <div className="ll:flex ll:items-center ll:gap-1">
          <p
            role="status"
            className="ll:m-0 ll:min-w-0 ll:flex-1 ll:text-amber-200"
          >
            {t(hasError ? "gatherings.failed" : "gatherings.stale")}
          </p>
          <Button
            type="button"
            variant="ghost"
            className={CHAT_GATHERING_ACTION_CLASS}
            disabled={discovery.isFetching}
            onClick={() => void discovery.refetch()}
          >
            {t(
              discovery.isFetching
                ? "gatherings.refreshing"
                : "gatherings.retry",
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
