import type { Timer } from "@/api/timers.api";
import type { MapThreat } from "@/lib/map-threat-source";
import type { MapOccupancy } from "@/lib/presence-map-index";
import { format } from "@/utils/local-date";
import { ClockArrowDown, ClockArrowUp, RotateCcw } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  getLevelSuffix,
  getTimerMembers,
  getMembersWithGuilds,
} from "../utils/timer-helpers";
import { TimerMapOccupancyList } from "./timer-map-occupancy-list";
import { TimerMapThreatList } from "./timer-map-threat-list";
import { TimerTooltipSection } from "./timer-tooltip-section";

type TimerTooltipProps = {
  guildNamesById: Record<string, string>;
  timer: Timer;
  occupancy?: MapOccupancy;
  threat?: MapThreat;
};

const DATE_FORMAT = "dd.MM HH:mm:ss";

export const TimerTooltip: FC<TimerTooltipProps> = ({
  guildNamesById,
  timer,
  occupancy,
  threat,
}) => {
  const { t } = useTranslation("timers");
  const levelSuffix = getLevelSuffix(timer.npc);
  const members = getTimerMembers(timer);

  const membersWithGuilds =
    members.length > 0
      ? getMembersWithGuilds(
          members,
          guildNamesById,
          timer.actorCharactersByMemberId,
        )
      : [];

  const firstMemberWithGuild = membersWithGuilds[0];
  const hiddenMembersCount = Math.max(membersWithGuilds.length - 1, 0);

  return (
    <div className="ll:flex ll:flex-col ll:gap-1.5 ll:py-0.5">
      <div className="ll:flex ll:flex-col ll:gap-0.5">
        <div className="ll:text-sm ll:font-semibold ll:leading-4">
          {timer.npc.name}
          <span className="ll:font-normal ll:text-muted-foreground">
            {levelSuffix}
          </span>
        </div>
        {timer.wasReset && (
          <div className="ll:flex ll:items-center ll:gap-1 ll:font-semibold ll:text-orange-400">
            <RotateCcw size={12} aria-hidden="true" />
            {t("tooltip.reset")}
          </div>
        )}
      </div>

      <TimerTooltipSection>
        <div className="ll:grid ll:grid-cols-[auto_auto_1fr] ll:items-center ll:gap-x-1.5 ll:gap-y-0.5">
          <ClockArrowDown
            size={12}
            aria-hidden="true"
            className="ll:text-green-400"
          />
          <span className="ll:text-muted-foreground">{t("tooltip.min")}</span>
          <span className="ll:tabular-nums">
            {format(new Date(timer.minSpawnTime), DATE_FORMAT)}
          </span>
          <ClockArrowUp
            size={12}
            aria-hidden="true"
            className="ll:text-red-400"
          />
          <span className="ll:text-muted-foreground">{t("tooltip.max")}</span>
          <span className="ll:tabular-nums">
            {format(new Date(timer.maxSpawnTime), DATE_FORMAT)}
          </span>
        </div>
      </TimerTooltipSection>

      {occupancy && <TimerMapOccupancyList occupancy={occupancy} />}

      {threat && <TimerMapThreatList threat={threat} />}

      {(firstMemberWithGuild || timer.updatedAt) && (
        <TimerTooltipSection>
          <div className="ll:grid ll:grid-cols-[auto_minmax(0,1fr)] ll:gap-x-1.5 ll:gap-y-0.5">
            {firstMemberWithGuild && (
              <>
                <span className="ll:text-muted-foreground">
                  {t("tooltip.addedBy")}
                </span>
                <span className="ll:flex ll:flex-col ll:wrap-break-word">
                  <span>
                    {firstMemberWithGuild.memberLabel}
                    {hiddenMembersCount > 0 && (
                      <span className="ll:ml-1 ll:text-muted-foreground">
                        +{hiddenMembersCount}
                      </span>
                    )}
                  </span>
                  {firstMemberWithGuild.characterLabel && (
                    <span className="ll:text-muted-foreground">
                      {firstMemberWithGuild.characterLabel}
                    </span>
                  )}
                </span>
              </>
            )}
            {timer.updatedAt && (
              <>
                <span className="ll:text-muted-foreground">
                  {t("tooltip.addedAt")}
                </span>
                <span className="ll:tabular-nums">
                  {format(new Date(timer.updatedAt), DATE_FORMAT)}
                </span>
              </>
            )}
          </div>
        </TimerTooltipSection>
      )}
    </div>
  );
};
