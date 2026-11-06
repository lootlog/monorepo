import { useTranslation } from "react-i18next";
import { PlayerName } from "@/components/player-name";
import { useNow } from "@/hooks/ui/use-now";
import { isMapThreatEnemyFresh, type MapThreat } from "@/lib/map-threat-source";
import { TimerMapThreatIndicator } from "./timer-map-threat-indicator";
import { TimerTooltipRows } from "./timer-tooltip-rows";
import { TimerTooltipSection } from "./timer-tooltip-section";

/** Tooltip section; ticks every second only while the tooltip is open. */
export function TimerMapThreatList({
  threat,
  expanded,
}: {
  threat: MapThreat;
  expanded: boolean;
}) {
  const { t } = useTranslation("timers");
  const now = useNow(1_000);

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
              {
                count:
                  threat.freshCount > 0
                    ? threat.freshCount
                    : threat.enemies.length,
              },
            )}
          </span>
        </>
      }
    >
      <TimerTooltipRows
        items={threat.enemies}
        expanded={expanded}
        getKey={(enemy) => enemy.targetId}
        getRowClassName={(enemy) =>
          isMapThreatEnemyFresh(enemy, now) ? undefined : "ll:opacity-60"
        }
        renderRow={(enemy) => (
          <>
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
          </>
        )}
      />
    </TimerTooltipSection>
  );
}
