import type { Timer } from "@/api/timers.api";
import { format } from "date-fns";
import { ClockArrowDown, ClockArrowUp } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  getLevelSuffix,
  getTimerMembers,
  getMembersWithGuilds,
} from "../utils/timer-helpers";

type TimerTooltipProps = {
  guildNamesById: Record<string, string>;
  timer: Timer;
};

export const TimerTooltip: FC<TimerTooltipProps> = ({
  guildNamesById,
  timer,
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

  return (
    <div className="ll:flex ll:flex-col ll:gap-1">
      <div className="ll:flex ll:flex-col ll:gap-0.5 ll:pb-1 ll:border-gray-600">
        <div className="ll:text-sm ll:font-bold ll:text-white">
          {timer.npc.name} <span className="ll:text-white">{levelSuffix}</span>
        </div>
      </div>

      {membersWithGuilds.length > 0 && (
        <div className="ll:text-xs ll:text-gray-300">
          <span className="ll:text-gray-400">{t("tooltip.addedBy")}</span>
          <div className="ll:mt-0.5 ll:flex ll:flex-col ll:gap-0.5">
            {membersWithGuilds.map(({ id, memberLabel, characterLabel }) => (
              <div className="ll:flex ll:flex-col ll:gap-0.5" key={id}>
                <span className="ll:font-semibold ll:wrap-break-word">
                  {memberLabel}
                </span>
                {characterLabel && (
                  <span className="ll:wrap-break-word">{characterLabel}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {timer.wasReset && (
        <div className="ll:text-xs ll:text-orange-400 ll:flex ll:items-center ll:gap-1">
          <span className="ll:font-semibold">{t("tooltip.reset")}</span>
        </div>
      )}

      {timer.updatedAt && (
        <div className="ll:text-xs ll:text-gray-400">
          <span className="ll:text-gray-400">{t("tooltip.addedAt")}</span>{" "}
          <span className="ll:text-gray-300">
            {format(new Date(timer.updatedAt), "dd.MM.yyyy - HH:mm:ss")}
          </span>
        </div>
      )}

      <div className="ll:flex ll:flex-col ll:gap-0.5 ll:text-xs">
        <div className="ll:flex ll:items-center ll:gap-1.5">
          <ClockArrowDown size={14} className="ll:text-green-400" />
          <span className="ll:text-gray-400 ll:w-8">{t("tooltip.min")}</span>
          <span className="ll:text-gray-200">
            {format(new Date(timer.minSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
          </span>
        </div>
        <div className="ll:flex ll:items-center ll:gap-1.5">
          <ClockArrowUp size={14} className="ll:text-red-400" />
          <span className="ll:text-gray-400 ll:w-8">{t("tooltip.max")}</span>
          <span className="ll:text-gray-200">
            {format(new Date(timer.maxSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
          </span>
        </div>
      </div>
    </div>
  );
};
