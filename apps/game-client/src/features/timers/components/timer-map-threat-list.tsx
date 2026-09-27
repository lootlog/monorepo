import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { isMapThreatEnemyFresh, type MapThreat } from "@/lib/map-threat-source";
import { TIMER_TOOLTIP_MAX_ROWS } from "../constants/timer-tooltip";

/** Tooltip section; ticks every second only while the tooltip is open. */
export function TimerMapThreatList({ threat }: { threat: MapThreat }) {
  const { t } = useTranslation(["timers", "settings"]);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="ll:flex ll:flex-col ll:gap-0.5">
      <span className="ll:font-semibold ll:text-red-400">
        {threat.freshCount > 0
          ? t("tooltip.mapThreat", { count: threat.freshCount })
          : t("tooltip.mapThreatStale", { count: threat.enemies.length })}
      </span>
      {threat.enemies.slice(0, TIMER_TOOLTIP_MAX_ROWS).map((enemy) => (
        <span
          key={enemy.targetId}
          className={cn("ll:wrap-break-word", {
            "ll:opacity-60": !isMapThreatEnemyFresh(enemy, now),
          })}
        >
          {enemy.nickname}
          {enemy.lvl !== undefined && ` (${enemy.lvl})`}
          {enemy.clan && (
            <span className="ll:text-muted-foreground">
              {" "}
              · {enemy.clan.name}
            </span>
          )}
          {enemy.stasis && (
            <span className="ll:ml-1 ll:text-orange-400">
              {t("tooltip.afk")}
            </span>
          )}
          <span className="ll:ml-1 ll:text-muted-foreground">
            {t("settings:airTags.seenSeconds", {
              seconds: Math.max(0, Math.floor((now - enemy.seenAt) / 1_000)),
            })}
          </span>
        </span>
      ))}
      {threat.enemies.length > TIMER_TOOLTIP_MAX_ROWS && (
        <span className="ll:text-muted-foreground">
          {t("tooltip.more", {
            count: threat.enemies.length - TIMER_TOOLTIP_MAX_ROWS,
          })}
        </span>
      )}
    </div>
  );
}
