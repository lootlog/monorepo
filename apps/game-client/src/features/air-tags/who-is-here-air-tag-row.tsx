import { useTranslation } from "react-i18next";
import {
  getWhoIsHereRelationColor,
  startPrivateMessage,
} from "@/lib/margonem-runtime/adapters/who-is-here-runtime-adapter";
import type { WhoIsHereAirTagEnemy } from "./who-is-here-air-tag-enemies";

/** Game default for clan enemies, used until the game reports the player's colour. */
const FALLBACK_ENEMY_COLOR = "#fc3e40";

export function WhoIsHereAirTagRow({
  enemy,
  now,
}: {
  enemy: WhoIsHereAirTagEnemy;
  now: number;
}) {
  const { t } = useTranslation("settings");

  const color =
    getWhoIsHereRelationColor(enemy.targetId, enemy.effectiveRelation) ??
    FALLBACK_ENEMY_COLOR;

  // Like a native row, a click starts a private message.
  return (
    <button
      type="button"
      onClick={() => startPrivateMessage(enemy.nickname)}
      className="ll-custom-cursor-pointer ll:flex ll:w-full ll:min-w-0 ll:items-baseline ll:gap-1 ll:border-0 ll:bg-transparent ll:px-1 ll:py-0.5 ll:text-left ll:text-[11px] ll:text-foreground ll:hover:bg-white/10 ll:focus-visible:outline-2 ll:focus-visible:-outline-offset-2 ll:focus-visible:outline-ring"
    >
      <span className="ll:truncate ll:font-semibold" style={{ color }}>
        {enemy.nickname}
      </span>
      {enemy.lvl !== undefined && (
        <span className="ll:shrink-0">({enemy.lvl})</span>
      )}
      {enemy.clan && (
        <span className="ll:truncate ll:text-muted-foreground">
          {enemy.clan.name}
        </span>
      )}
      {enemy.stasis && (
        <span className="ll:shrink-0 ll:text-orange-400">
          {t("airTags.afk")}
        </span>
      )}
      <span className="ll:ml-auto ll:shrink-0 ll:text-muted-foreground">
        {t("airTags.seenSeconds", {
          seconds: Math.max(0, Math.floor((now - enemy.observedAt) / 1_000)),
        })}
      </span>
    </button>
  );
}
