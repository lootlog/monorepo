import { useTranslation } from "react-i18next";
import { PlayerName } from "@/components/player-name";
import type { MapOccupancy } from "@/lib/presence-map-index";
import { TimerMapPresenceIndicator } from "./timer-map-presence-indicator";
import { TimerTooltipRows } from "./timer-tooltip-rows";
import { TimerTooltipSection } from "./timer-tooltip-section";

export function TimerMapOccupancyList({
  occupancy,
  expanded,
}: {
  occupancy: MapOccupancy;
  expanded: boolean;
}) {
  const { t } = useTranslation("timers");

  return (
    <TimerTooltipSection
      heading={
        <>
          <TimerMapPresenceIndicator occupancy={occupancy} decorative />
          <span className="ll:text-green-400">
            {t("tooltip.alliesHeading", {
              count: occupancy.players.length,
            })}
          </span>
        </>
      }
    >
      <TimerTooltipRows
        items={occupancy.players}
        expanded={expanded}
        getKey={(player) => player.key}
        renderRow={(player) => (
          <>
            <PlayerName
              name={player.name}
              level={player.lvl}
              profession={player.prof}
              clanName={player.clanName}
            />
            {player.isAfk && (
              <span className="ll:text-orange-400">{t("tooltip.afk")}</span>
            )}
          </>
        )}
      />
    </TimerTooltipSection>
  );
}
