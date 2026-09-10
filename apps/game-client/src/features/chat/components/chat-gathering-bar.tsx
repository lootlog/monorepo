import { useReadyRoomWithdrawal } from "@/features/party-finder/hooks/use-ready-room-withdrawal";
import { ChatAvailableGatherings } from "./chat-available-gatherings";
import { CHAT_GATHERING_ACTION_CLASS } from "../chat.constants";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
import {
  getHiddenPartyGatheringsScopeKey,
  useHiddenPartyGatheringsStore,
} from "@/store/hidden-party-gatherings.store";
import { ChatHiddenGatherings } from "./chat-hidden-gatherings";

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

export function ChatGatheringBar({
  isVisible = true,
  children,
}: {
  isVisible?: boolean;
  children: (
    gatheringBar: ReactNode,
    hiddenGatherings: ReactNode,
    ownGathering: ReactNode,
  ) => ReactNode;
}) {
  const { t } = useTranslation("chat");
  const discovery = useActivePartyGatherings();
  const level = useGameStore((state) => state.game?.hero.level ?? 0);

  const scopeKey = useGameStore((state) =>
    getHiddenPartyGatheringsScopeKey({
      userId: discovery.userId,
      world: discovery.world,
      accountId: state.game?.hero.accountId,
      characterId: state.game?.hero.characterId,
    }),
  );

  const hiddenByScope = useHiddenPartyGatheringsStore(
    (state) => state.hiddenByScope,
  );

  const identity = getCurrentReadyRoomCharacterIdentity();

  const room = usePartyFinderStore(
    (state) =>
      selectOwnedReadyRoom(state) ??
      selectReadyRoomForCharacter(state, identity),
  );

  const roomId = room?.notificationId;
  const isOrganizer = room?.viewer === "ORGANIZER";
  const queryClient = useQueryClient();
  const participantRoom = isOrganizer ? null : room;
  const withdrawal = useReadyRoomWithdrawal(participantRoom);
  const [withdrawFailed, setWithdrawFailed] = useState(false);
  const withdrawingRef = useRef(false);

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const [frozen, setFrozen] = useState<ActivePartyGatheringSummary | null>(
    null,
  );

  const barRef = useRef<HTMLDivElement>(null);
  const hiddenTriggerRef = useRef<HTMLButtonElement>(null);
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

  const eligibleGatherings = discovery.data.filter(
    (candidate) =>
      level >= (candidate.minLvl ?? 0) &&
      level <= (candidate.maxLvl ?? Infinity),
  );

  const hiddenIds = scopeKey ? hiddenByScope[scopeKey] : undefined;

  const hidden = (candidate: ActivePartyGatheringSummary) =>
    (hiddenIds?.[candidate.notificationId] ?? 0) > discovery.observedAt;

  const candidates = eligibleGatherings.filter(
    (candidate) => !hidden(candidate) && candidate.notificationId !== roomId,
  );

  const hiddenGatherings = eligibleGatherings.filter(hidden);
  const locked = hovered || focused || application.isPending;
  const target = selectFeaturedGathering(candidates, locked ? frozen : null);

  const apply = (
    candidate: ActivePartyGatheringSummary,
    allowHidden = false,
  ) => {
    if (
      pendingRef.current ||
      room ||
      discovery.isStale ||
      (!allowHidden &&
        useHiddenPartyGatheringsStore
          .getState()
          .isHidden(scopeKey, candidate.notificationId))
    )
      return;
    pendingRef.current = true;
    setFrozen(candidate);
    application.mutate(candidate);
  };

  const hideGathering = (candidate: ActivePartyGatheringSummary) => {
    if (!scopeKey || pendingRef.current || roomId === candidate.notificationId)
      return;
    useHiddenPartyGatheringsStore
      .getState()
      .hide(
        scopeKey,
        candidate.notificationId,
        Date.parse(candidate.expiresAt),
      );

    if (target?.notificationId === candidate.notificationId) setFrozen(null);
    requestAnimationFrame(() => hiddenTriggerRef.current?.focus());
  };

  useEffect(() => {
    const join = () => {
      if (!isVisible || !barRef.current?.getClientRects().length) return;

      if (room) {
        if (isOrganizer || withdrawingRef.current) return;
        setWithdrawFailed(false);
        const request = withdrawal.withdraw();

        if (!request) return;
        withdrawingRef.current = true;
        void request
          .catch(() => setWithdrawFailed(true))
          .finally(() => {
            withdrawingRef.current = false;
          });
      } else if (target) {
        apply(target);
      }
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

  const appliedHidden = hiddenGatherings.some(
    (candidate) => candidate.notificationId === appliedTarget?.notificationId,
  );

  const applyFailed =
    applyError &&
    [
      appliedTarget.notificationId === target?.notificationId,
      appliedHidden,
    ].some(Boolean);

  useEffect(() => {
    if (
      applyError &&
      !appliedHidden &&
      appliedTarget.notificationId !== target?.notificationId
    )
      resetApplication();
  }, [
    applyError,
    appliedTarget,
    resetApplication,
    target?.notificationId,
    appliedHidden,
  ]);

  const showBar = [
    participantRoom,
    candidates.length,
    hasError,
    applyFailed,
  ].some(Boolean);

  return children(
    showBar && (
      <div
        ref={barRef}
        className="ll:overflow-hidden ll:border-solid ll:border-x-0 ll:border-t-0 ll:border-b ll:border-gray-400/40 ll:shadow-lg ll:text-[11px] ll:leading-[14px] ll:[--ll-chat-detail-font-size:11px] ll:[--ll-chat-detail-line-height:14px] ll:text-gray-100"
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
        <ChatAvailableGatherings
          candidates={candidates}
          target={target}
          room={participantRoom}
          hasOwnGathering={isOrganizer}
          roomSummary={discovery.data.find(
            (candidate) => candidate.notificationId === roomId,
          )}
          pending={application.isPending}
          stale={discovery.isStale}
          onApply={apply}
          onHide={hideGathering}
        />
        {withdrawFailed && (
          <p role="alert" className="ll:m-0 ll:px-1.5 ll:text-amber-200">
            {t("gatherings.withdrawFailed")}
          </p>
        )}
        {applyFailed && (
          <p role="alert" className="ll:m-0 ll:px-1.5 ll:text-amber-200">
            {t("gatherings.applyFailed")}
          </p>
        )}
        {discovery.isStale ? (
          <div className="ll:flex ll:items-center ll:gap-1 ll:px-1.5">
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
    ),
    candidates.length + hiddenGatherings.length > 0 && (
      <ChatHiddenGatherings
        triggerRef={hiddenTriggerRef}
        gatherings={hiddenGatherings}
        activeGatherings={candidates}
        pending={application.isPending}
        disabled={[room, discovery.isStale].some(Boolean)}
        onApply={(candidate) => apply(candidate, true)}
        onRestore={(notificationId) => {
          if (scopeKey)
            useHiddenPartyGatheringsStore
              .getState()
              .restore(scopeKey, notificationId);
          requestAnimationFrame(() =>
            (
              hiddenTriggerRef.current ??
              barRef.current?.querySelector<HTMLButtonElement>("button")
            )?.focus(),
          );
        }}
      />
    ),
    isOrganizer && (
      <div className="ll:shrink-0 ll:border-solid ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40 ll:text-[11px] ll:leading-[14px] ll:text-gray-100">
        <ChatAvailableGatherings
          candidates={[]}
          target={null}
          room={room}
          roomSummary={discovery.data.find(
            (candidate) => candidate.notificationId === roomId,
          )}
          pending={application.isPending}
          stale={discovery.isStale}
          onApply={apply}
          onHide={hideGathering}
        />
      </div>
    ),
  );
}
