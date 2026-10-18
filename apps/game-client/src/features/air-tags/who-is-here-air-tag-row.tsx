import { useTranslation } from "react-i18next";
import { formatLevel } from "@lootlog/domain/profession";
import {
  getWhoIsHereRelationColor,
  startPrivateMessage,
} from "@/lib/margonem-runtime/adapters/who-is-here-runtime-adapter";
import type { WhoIsHereAirTagEnemy } from "./who-is-here-air-tag-enemies";

/** Game default for clan enemies, used until the game reports the player's colour. */
const FALLBACK_ENEMY_COLOR = "#fc3e40";

/**
 * A row built from the game's own "one-other" classes, so it looks like the
 * native rows above it: the relation colour, the AFK icon and the level on
 * the right. The age stands where native rows show the battle icon.
 */
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

  const seenSeconds = Math.max(0, Math.floor((now - enemy.observedAt) / 1_000));

  // Like a native row, a click starts a private message.
  return (
    <button
      type="button"
      onClick={() => startPrivateMessage(enemy.nickname)}
      title={
        enemy.clan ? `${enemy.nickname} · ${enemy.clan.name}` : enemy.nickname
      }
      className="one-other tw-list-item ll:block ll:w-full ll:border-0 ll:text-left ll:focus-visible:outline-2 ll:focus-visible:-outline-offset-2 ll:focus-visible:outline-ring"
    >
      <span className="center" style={{ color }}>
        <span className="name">
          <span className="inner ll:block">{enemy.nickname}</span>
        </span>
        <span className="icons">
          {enemy.stasis && (
            <span
              role="img"
              aria-label={t("airTags.afk")}
              className="stasis active"
            />
          )}
          <span className="ll:pl-1 ll:font-normal ll:text-muted-foreground">
            {t("airTags.seenAgo", { seconds: seenSeconds })}
          </span>
        </span>
        {enemy.lvl !== undefined && (
          <span className="lvl">{formatLevel(enemy.lvl, enemy.prof)}</span>
        )}
      </span>
    </button>
  );
}
