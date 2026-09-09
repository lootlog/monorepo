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

export function ChatGatheringBar({
  isVisible = true,
}: {
  isVisible?: boolean;
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
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
    onError: () => setError(true),
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
    if (pendingRef.current || room) return;
    pendingRef.current = true;
    setFrozen(candidate);
    setError(false);
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
  const label = (candidate: ActivePartyGatheringSummary) =>
    `${candidate.npc?.name ?? candidate.description ?? t("gatherings.generic")} · ${candidate.organizerName} · ${discovery.visibleGuilds
      .filter((guild) => candidate.guildIds.includes(guild.id))
      .map((guild) => guild.name)
      .join(", ")}`;
  const hasError = error || discovery.isError;
  if (!room && candidates.length === 0 && !hasError) return null;
  return (
    <div
      ref={barRef}
      className="ll:shrink-0 ll:border-t ll:border-amber-600/40 ll:bg-amber-950/30 ll:p-1.5 ll:text-xs"
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
        <ChatOwnGatheringBar room={room} onError={() => setError(true)} />
      ) : target ? (
        <div className="ll:flex ll:items-center ll:gap-1">
          <span
            className="ll:min-w-0 ll:flex-1 ll:truncate"
            title={label(target)}
          >
            {label(target)}
          </span>
          {locked && newest?.notificationId !== target.notificationId ? (
            <span>{t("gatherings.new")}</span>
          ) : null}
          <Button
            disabled={application.isPending}
            onClick={() => apply(target)}
          >
            {t(
              application.isPending
                ? "gatherings.applying"
                : "gatherings.apply",
            )}
          </Button>
          {candidates.length > 1 ? (
            <Button
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {t("gatherings.others", { count: candidates.length - 1 })}
            </Button>
          ) : null}
        </div>
      ) : (
        <Button onClick={() => setFrozen(newest)}>
          {t("gatherings.showLatest")}
        </Button>
      )}
      {expanded && !room ? (
        <ul className="ll:max-h-32 ll:overflow-auto">
          {candidates
            .filter(
              (candidate) =>
                candidate.notificationId !== target?.notificationId,
            )
            .map((candidate) => (
              <li
                key={candidate.notificationId}
                className="ll:flex ll:items-center ll:gap-1 ll:py-1"
              >
                <span
                  className="ll:min-w-0 ll:flex-1 ll:truncate"
                  title={label(candidate)}
                >
                  {label(candidate)}
                </span>
                <Button
                  disabled={application.isPending}
                  onClick={() => apply(candidate)}
                >
                  {t("gatherings.apply")}
                </Button>
              </li>
            ))}
        </ul>
      ) : null}
      {hasError ? (
        <p role="alert">
          {t("gatherings.failed")}{" "}
          <button
            type="button"
            onClick={() => {
              setError(false);
              void discovery.refetch();
            }}
          >
            {t("gatherings.retry")}
          </button>
        </p>
      ) : null}
    </div>
  );
}
