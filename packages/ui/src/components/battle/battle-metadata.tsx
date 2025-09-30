import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../tooltip.js";
import { format } from "date-fns";
import { Calendar, Clock, Lock, Unlock, Users } from "lucide-react";
import { FC } from "react";
import { formatSeconds } from "../../lib/date-utils.js";
import type { SharedBattleData } from "../../types/battle.js";

export type BattleMetadataProps = {
  battle: Pick<SharedBattleData, 'duration' | 'type'> & {
    createdAt: string;
    public: boolean;
  };
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
  labels = {
    startTime: "Battle start date and time",
    duration: "Battle duration",
    battleType: "Battle type",
    public: "Public",
    private: "Private",
    publicTooltip: "This battle is public - it can be viewed by anyone with the link",
    privateTooltip: "This battle is private - only you can see it",
  }
}) => {
  return (
    <TooltipProvider>
      <div className="flex flex-row gap-4 p-4 text-xs text-muted-foreground w-full justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help">
              <Calendar size="14" />
              {battle && format(battle.createdAt, "dd.MM.yyyy HH:mm")}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>{labels.startTime}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <Clock size="14" />
              {formatSeconds(battle.duration)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>{labels.duration}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <Users size="14" />
              {battle.type}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>{labels.battleType}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              {battle.public ? <Unlock size="14" /> : <Lock size="14" />}
              {battle.public ? labels.public : labels.private}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>
              {battle.public ? labels.publicTooltip : labels.privateTooltip}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};