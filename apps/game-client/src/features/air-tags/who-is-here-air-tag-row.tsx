import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatLevel } from "@lootlog/domain/profession";
import {
  buildPlayerTipHtml,
  setPlayerTip,
} from "@/lib/margonem-runtime/adapters/minimap-player-runtime-adapter";
import {
  getWhoIsHereRelationColor,
  startPrivateMessage,
} from "@/lib/margonem-runtime/adapters/who-is-here-runtime-adapter";
import type { AirTagTarget } from "@lootlog/schema/air-tag";

const FALLBACK_ENEMY_COLOR = "#fc3e40";

export function WhoIsHereAirTagRow({
  enemy,
  now,
}: {
  enemy: AirTagTarget;
  now: number;
}) {
  const { t } = useTranslation("settings");

  const color =
    getWhoIsHereRelationColor(enemy.targetId, enemy.relation) ??
    FALLBACK_ENEMY_COLOR;

  const seenSeconds = Math.max(0, Math.floor((now - enemy.observedAt) / 1_000));

  const row = useRef<HTMLButtonElement>(null);
  const [hasGameTip, setHasGameTip] = useState(false);
  const { nickname, lvl, prof } = enemy;
  const clanName = enemy.clan?.name;

  useEffect(() => {
    const element = row.current;

    const tip = buildPlayerTipHtml({
      nick: nickname,
      level: lvl,
      prof,
      clanName,
    });

    if (!element || !tip) return;
    setPlayerTip(element, tip);
    setHasGameTip(true);

    return () => setPlayerTip(element, null);
  }, [nickname, lvl, prof, clanName]);

  return (
    <button
      ref={row}
      type="button"
      onClick={() => startPrivateMessage(enemy.nickname)}
      title={
        hasGameTip
          ? undefined
          : clanName
            ? `${nickname} · ${clanName}`
            : nickname
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
