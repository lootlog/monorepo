import type { Timer } from "@/hooks/api/use-timers";
import { format } from "date-fns";
import { ClockArrowDown, ClockArrowUp } from "lucide-react";
import type { FC } from "react";
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
  const levelSuffix = getLevelSuffix(timer.npc);
  const members = getTimerMembers(timer);
  const membersWithGuilds =
    members.length > 0 ? getMembersWithGuilds(members, guildNamesById) : [];

  return (
    <div className="ll:flex ll:flex-col ll:gap-1">
      <div className="ll:flex ll:flex-col ll:gap-0.5 ll:pb-1 ll:border-gray-600">
        <div className="ll:text-sm ll:font-bold ll:text-white">
          {timer.npc.name} <span className="ll:text-white">{levelSuffix}</span>
        </div>
      </div>

      {membersWithGuilds.length > 0 && (
        <div className="ll:text-xs ll:text-gray-300">
          <span className="ll:text-gray-400">Dodane przez:</span>
          <div className="ll:mt-0.5 ll:flex ll:flex-col ll:gap-0.5">
            {membersWithGuilds.map(({ id, label }) => (
              <span className="ll:font-semibold ll:wrap-break-word" key={id}>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {timer.wasReset && (
        <div className="ll:text-xs ll:text-orange-400 ll:flex ll:items-center ll:gap-1">
          <span className="ll:font-semibold">⟳ Timer został zresetowany</span>
        </div>
      )}

      {timer.updatedAt && (
        <div className="ll:text-xs ll:text-gray-400">
          <span className="ll:text-gray-500">Dodano:</span>{" "}
          <span className="ll:text-gray-300">
            {format(new Date(timer.updatedAt), "dd.MM.yyyy - HH:mm:ss")}
          </span>
        </div>
      )}

      <div className="ll:flex ll:flex-col ll:gap-0.5 ll:text-xs">
        <div className="ll:flex ll:items-center ll:gap-1.5">
          <ClockArrowDown size={14} className="ll:text-green-400" />
          <span className="ll:text-gray-400 ll:w-8">Min:</span>
          <span className="ll:text-gray-200">
            {format(new Date(timer.minSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
          </span>
        </div>
        <div className="ll:flex ll:items-center ll:gap-1.5">
          <ClockArrowUp size={14} className="ll:text-red-400" />
          <span className="ll:text-gray-400 ll:w-8">Max:</span>
          <span className="ll:text-gray-200">
            {format(new Date(timer.maxSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
          </span>
        </div>
      </div>
    </div>
  );
};
