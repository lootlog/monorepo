import type { PlayerPresence } from "@/lib/online-players-presence";
import { BadgeCheck } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type OnlinePlayerRelation = "self" | "party" | "clan" | undefined;

type OnlinePlayerTooltipProps = {
  canInviteToParty: boolean;
  isFriend: boolean;
  locationName: string;
  memberName: string;
  presence: PlayerPresence;
  relation: OnlinePlayerRelation;
};

const formatCoordinates = (location?: { x?: number; y?: number }) =>
  location?.x !== undefined && location.y !== undefined
    ? ` (${location.x}, ${location.y})`
    : "";

/**
 * Everything the list row has no room for: the full profession, clan,
 * Discord member, exact position and how the player relates to the hero.
 * Status colours match the row highlights.
 */
export const OnlinePlayerTooltip: FC<OnlinePlayerTooltipProps> = ({
  canInviteToParty,
  isFriend,
  locationName,
  memberName,
  presence,
  relation,
}) => {
  const { t } = useTranslation("onlinePlayers");
  const { player } = presence;

  const statuses = [
    relation === "self" && (
      <span key="self" className="ll:text-yellow-300">
        {t("tooltip.status.self")}
      </span>
    ),
    presence.isAfk && (
      <span key="afk" className="ll:text-orange-300">
        {t("tooltip.status.afk")}
      </span>
    ),
    relation === "party" && (
      <span key="party" className="ll:text-sky-300">
        {t("tooltip.status.party")}
      </span>
    ),
    relation === "clan" && (
      <span key="clan" className="ll:text-green-300">
        {t("tooltip.status.clan")}
      </span>
    ),
    isFriend && relation !== "self" && (
      <span key="friend">{t("tooltip.status.friend")}</span>
    ),
  ].filter(Boolean);

  return (
    <div className="ll:flex ll:flex-col ll:gap-2 ll:py-0.5">
      <div className="ll:flex ll:flex-col ll:gap-0.5">
        <span className="ll:text-sm ll:font-semibold ll:leading-4">
          {player?.name || t("player.unknown")}
        </span>
        {player ? (
          <span className="ll:text-muted-foreground">
            {t("tooltip.levelAndProfession", {
              level: player.lvl,
              profession: t(`professions.${player.prof}`, {
                defaultValue: player.prof,
              }),
            })}
          </span>
        ) : null}
      </div>

      <div className="ll:grid ll:grid-cols-[auto_1fr] ll:gap-x-2 ll:gap-y-1">
        <span className="ll:text-muted-foreground">{t("tooltip.discord")}</span>
        <span className="ll:wrap-break-word">{memberName}</span>
        {player?.clan?.name ? (
          <>
            <span className="ll:text-muted-foreground">
              {t("tooltip.clan")}
            </span>
            <span className="ll:wrap-break-word">{player.clan.name}</span>
          </>
        ) : null}
        <span className="ll:text-muted-foreground">
          {t("tooltip.location")}
        </span>
        <span className="ll:wrap-break-word ll:tabular-nums">
          {locationName}
          {formatCoordinates(player?.location)}
        </span>
      </div>

      {statuses.length > 0 || presence.margonemAccountVerified ? (
        <div className="ll:flex ll:flex-wrap ll:items-center ll:gap-x-2 ll:gap-y-0.5 ll:font-semibold">
          {statuses}
          {presence.margonemAccountVerified ? (
            <span className="ll:inline-flex ll:items-center ll:gap-1 ll:text-sky-300">
              <BadgeCheck aria-hidden="true" className="ll:size-3.5" />
              {t("player.verifiedMargonemAccount")}
            </span>
          ) : null}
        </div>
      ) : null}

      {canInviteToParty ? (
        <span className="ll:text-muted-foreground">
          {t("actions.doubleClickInviteParty")}
        </span>
      ) : null}
    </div>
  );
};
