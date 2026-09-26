import type { PlayerPresence } from "@/lib/online-players-presence";
import { BadgeCheck } from "lucide-react";
import type { FC } from "react";
import type { PlayerRelation } from "@/lib/player-relation";
import { useTranslation } from "react-i18next";

type OnlinePlayerTooltipProps = {
  canInviteToParty: boolean;
  locationName: string;
  memberName: string;
  presence: PlayerPresence;
  relations: readonly PlayerRelation[];
};

/** Text colours of the relation statuses, matching the row fills. */
const RELATION_TEXT_CLASSES: Record<PlayerRelation, string> = {
  self: "ll:text-yellow-300",
  party: "ll:text-purple-300",
  clan: "ll:text-green-300",
  enemy: "ll:text-red-300",
  "clan-enemy": "ll:text-red-300",
  friend: "ll:text-sky-300",
  "clan-ally": "ll:text-lime-300",
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
  locationName,
  memberName,
  presence,
  relations,
}) => {
  const { t } = useTranslation("onlinePlayers");
  const { player } = presence;

  const [firstRelation, ...otherRelations] = relations;

  const statuses = [
    ...(firstRelation === "self" ? [firstRelation] : []),
    ...(presence.isAfk ? (["afk"] as const) : []),
    ...(firstRelation && firstRelation !== "self" ? [firstRelation] : []),
    ...otherRelations,
  ].map((status) => (
    <span
      key={status}
      className={
        status === "afk" ? "ll:text-orange-300" : RELATION_TEXT_CLASSES[status]
      }
    >
      {t(`tooltip.status.${status}`)}
    </span>
  ));

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
