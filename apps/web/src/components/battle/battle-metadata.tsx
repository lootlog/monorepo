import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { format } from "date-fns";
import {
  Award,
  Calendar,
  Clock,
  Earth,
  Lock,
  Swords,
  Unlock,
  Users,
} from "lucide-react";
import { EmergencyExitIcon } from "@lootlog/ui/components/emergency-exit-icon";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { formatSeconds } from "@/utils/date/format-seconds";
import type { Battle } from "@/lib/api/battlelog-types";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { cn } from "@lootlog/ui/lib/utils";

export type BattleMetadataProps = {
  battle: Battle;
  align?: "left" | "center";
  className?: string;
  labels?: {
    startTime: string;
    duration: string;
    battleType: string;
    public: string;
    private: string;
    publicTooltip: string;
    privateTooltip: string;
  };
};

export const BattleMetadata: FC<BattleMetadataProps> = ({
  battle,
  align = "center",
  className,
  labels,
}) => {
  const { t } = useTranslation();
  const warrior = battle.warriors.find(
    (w) => w.originalId === battle.characterId,
  );
  const resolvedLabels = labels ?? {
    startTime: t("battleUi.metadata.startTime"),
    duration: t("battleUi.metadata.duration"),
    battleType: t("battleUi.metadata.battleType"),
    public: t("battleUi.metadata.public"),
    private: t("battleUi.metadata.private"),
    publicTooltip: t("battleUi.metadata.publicTooltip"),
    privateTooltip: t("battleUi.metadata.privateTooltip"),
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-row flex-wrap gap-4 p-4 text-xs text-muted-foreground w-full",
          align === "center" ? "justify-center" : "justify-start",
          className,
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help whitespace-nowrap">
              <Calendar size="14" />
              {battle && format(battle.createdAt, "dd.MM.yyyy HH:mm")}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>{resolvedLabels.startTime}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help whitespace-nowrap">
              <Clock size="14" />
              {formatSeconds(battle.duration)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>{resolvedLabels.duration}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help whitespace-nowrap">
              <Users size="14" />
              {battle.type}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>{resolvedLabels.battleType}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help whitespace-nowrap">
              {battle.public ? <Unlock size="14" /> : <Lock size="14" />}
              {battle.public ? resolvedLabels.public : resolvedLabels.private}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>
              {battle.public
                ? resolvedLabels.publicTooltip
                : resolvedLabels.privateTooltip}
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help whitespace-nowrap">
              <Earth size={14} /> {capitalizeFirstLetter(battle.world)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>{t("battleUi.metadata.world")}</p>
          </TooltipContent>
        </Tooltip>

        {warrior?.ph !== 0 && warrior?.ph !== undefined && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help whitespace-nowrap">
                <Award size={14} />{" "}
                {t("battleUi.metadata.honorPointsLabel", {
                  value: warrior?.ph,
                })}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              <p>{t("battleUi.metadata.honorPointsTooltip")}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {battle.hasFlee && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help whitespace-nowrap">
                <EmergencyExitIcon size={14} /> {t("battleUi.metadata.flee")}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              <p>{t("battleUi.metadata.fleeTooltip")}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {battle.matchmaking && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help whitespace-nowrap text-purple-500">
                <Swords size={14} /> {t("battleUi.metadata.matchmaking")}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              <p>{t("battleUi.metadata.matchmakingTooltip")}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
