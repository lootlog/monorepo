import { useTranslation } from "react-i18next";
import { PlayerName } from "@/components/player-name";
import type { MapOccupancy } from "@/lib/presence-map-index";
import { TIMER_TOOLTIP_MAX_ROWS } from "../constants/timer-tooltip";
import { TimerMapPresenceIndicator } from "./timer-map-presence-indicator";
import { TimerTooltipSection } from "./timer-tooltip-section";

export function TimerMapOccupancyList({
  occupancy,
}: {
  occupancy: MapOccupancy;
}) {
  const { t } = useTranslation("timers");

  return (
    <TimerTooltipSection
      heading={
        <>
          <TimerMapPresenceIndicator occupancy={occupancy} decorative />
          <span className="ll:text-green-400">
            {t("tooltip.alliesHeading")}
          </span>
        </>
      }
    >
      <ul className="ll:m-0 ll:flex ll:list-none ll:flex-col ll:gap-0.5 ll:p-0">
        {occupancy.players.slice(0, TIMER_TOOLTIP_MAX_ROWS).map((player) => (
          <li
            key={player.key}
            className="ll:grid ll:grid-cols-[minmax(0,1fr)_auto] ll:gap-x-2"
          >
            <PlayerName
              name={player.name}
              level={player.lvl}
              profession={player.prof}
              clanName={player.clanName}
            />
            {player.isAfk && (
              <span className="ll:text-orange-400">{t("tooltip.afk")}</span>
            )}
          </li>
        ))}
      </ul>
      {occupancy.players.length > TIMER_TOOLTIP_MAX_ROWS && (
        <span className="ll:text-muted-foreground">
          {t("tooltip.more", {
            count: occupancy.players.length - TIMER_TOOLTIP_MAX_ROWS,
          })}
        </span>
      )}
    </TimerTooltipSection>
  );
}
