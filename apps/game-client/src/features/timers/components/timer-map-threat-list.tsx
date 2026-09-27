import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { PlayerName } from "@/components/player-name";
import { isMapThreatEnemyFresh, type MapThreat } from "@/lib/map-threat-source";
import { TIMER_TOOLTIP_MAX_ROWS } from "../constants/timer-tooltip";
import { TimerMapThreatIndicator } from "./timer-map-threat-indicator";
import { TimerTooltipSection } from "./timer-tooltip-section";

/** Tooltip section; ticks every second only while the tooltip is open. */
export function TimerMapThreatList({ threat }: { threat: MapThreat }) {
  const { t } = useTranslation("timers");
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <TimerTooltipSection
      heading={
        <>
          <TimerMapThreatIndicator threat={threat} decorative />
          <span className="ll:text-red-400">
            {t(
              threat.freshCount > 0
                ? "tooltip.enemiesHeading"
                : "tooltip.enemiesStaleHeading",
            )}
          </span>
        </>
      }
    >
      <ul className="ll:m-0 ll:flex ll:list-none ll:flex-col ll:gap-0.5 ll:p-0">
        {threat.enemies.slice(0, TIMER_TOOLTIP_MAX_ROWS).map((enemy) => (
          <li
            key={enemy.targetId}
            className={cn(
              "ll:grid ll:grid-cols-[minmax(0,1fr)_auto] ll:gap-x-2",
              { "ll:opacity-60": !isMapThreatEnemyFresh(enemy, now) },
            )}
          >
            <PlayerName
              name={enemy.nickname}
              level={enemy.lvl}
              profession={enemy.prof}
              clanName={enemy.clan?.name}
            />
            <span className="ll:tabular-nums ll:text-muted-foreground">
              {enemy.stasis && (
                <span className="ll:mr-1 ll:text-orange-400">
                  {t("tooltip.afk")}
                </span>
              )}
              {t("tooltip.seenAgo", {
                seconds: Math.max(0, Math.floor((now - enemy.seenAt) / 1_000)),
              })}
            </span>
          </li>
        ))}
      </ul>
      {threat.enemies.length > TIMER_TOOLTIP_MAX_ROWS && (
        <span className="ll:text-muted-foreground">
          {t("tooltip.more", {
            count: threat.enemies.length - TIMER_TOOLTIP_MAX_ROWS,
          })}
        </span>
      )}
    </TimerTooltipSection>
  );
}
