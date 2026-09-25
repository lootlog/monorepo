import type { Timer } from "@/api/timers.api";
import { format } from "@/utils/local-date";
import { ClockArrowDown, ClockArrowUp, RotateCcw } from "lucide-react";
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

const DATE_FORMAT = "dd.MM.yyyy - HH:mm:ss";

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

  const firstMemberWithGuild = membersWithGuilds[0];
  const hiddenMembersCount = Math.max(membersWithGuilds.length - 1, 0);

  return (
    <div className="ll:flex ll:flex-col ll:gap-2 ll:py-0.5">
      <div className="ll:text-sm ll:font-semibold ll:leading-4">
        {timer.npc.name} <span>{levelSuffix}</span>
      </div>

      {firstMemberWithGuild && (
        <div className="ll:flex ll:flex-col ll:gap-0.5">
          <span className="ll:text-muted-foreground">
            {t("tooltip.addedBy")}
          </span>
          <span className="ll:font-semibold ll:wrap-break-word">
            {firstMemberWithGuild.memberLabel}
            {hiddenMembersCount > 0 && (
              <span className="ll:ml-1 ll:font-normal ll:text-muted-foreground">
                +{hiddenMembersCount}
              </span>
            )}
          </span>
          {firstMemberWithGuild.characterLabel && (
            <span className="ll:wrap-break-word">
              {firstMemberWithGuild.characterLabel}
            </span>
          )}
        </div>
      )}

      {timer.wasReset && (
        <div className="ll:flex ll:items-center ll:gap-1 ll:font-semibold ll:text-orange-400">
          <RotateCcw size={14} aria-hidden="true" />
          {t("tooltip.reset")}
        </div>
      )}

      {timer.updatedAt && (
        <div className="ll:flex ll:flex-col ll:gap-0.5">
          <span className="ll:text-muted-foreground">
            {t("tooltip.addedAt")}
          </span>
          <span>{format(new Date(timer.updatedAt), DATE_FORMAT)}</span>
        </div>
      )}

      <div className="ll:grid ll:grid-cols-[auto_auto_1fr] ll:items-center ll:gap-x-2 ll:gap-y-1">
        <ClockArrowDown size={14} className="ll:text-green-400" />
        <span className="ll:text-muted-foreground">{t("tooltip.min")}</span>
        <span className="ll:tabular-nums">
          {format(new Date(timer.minSpawnTime), DATE_FORMAT)}
        </span>
        <ClockArrowUp size={14} className="ll:text-red-400" />
        <span className="ll:text-muted-foreground">{t("tooltip.max")}</span>
        <span className="ll:tabular-nums">
          {format(new Date(timer.maxSpawnTime), DATE_FORMAT)}
        </span>
      </div>
    </div>
  );
};
