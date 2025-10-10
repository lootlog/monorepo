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
  Unlock,
  Users,
} from "lucide-react";
import { EmergencyExitIcon } from "@lootlog/ui/components/emergency-exit-icon";
import { FC } from "react";
import { formatSeconds } from "@/utils/date/format-seconds";
import { Battle } from "@/hooks/api/battle-log/use-battles";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";

export type BattleMetadataProps = {
  battle: Battle;
  align?: "left" | "center";
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
  labels = {
    startTime: "Battle start date and time",
    duration: "Battle duration",
    battleType: "Battle type",
    public: "Public",
    private: "Private",
    publicTooltip:
      "This battle is public - it can be viewed by anyone with the link",
    privateTooltip: "This battle is private - only you can see it",
  },
}) => {
  const warrior = battle.warriors.find(
    (w) => w.originalId === battle.characterId
  );

  return (
    <TooltipProvider>
      <div
        className={`flex flex-row flex-wrap gap-4 p-4 text-xs text-muted-foreground w-full ${align === "center" ? "justify-center" : "justify-start"}`}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help whitespace-nowrap">
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
            <div className="flex items-center gap-1 cursor-help whitespace-nowrap">
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
            <div className="flex items-center gap-1 cursor-help whitespace-nowrap">
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
            <div className="flex items-center gap-1 cursor-help whitespace-nowrap">
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

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help whitespace-nowrap">
              <Earth size={14} /> {capitalizeFirstLetter(battle.world)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>Świat</p>
          </TooltipContent>
        </Tooltip>

        {warrior?.ph !== 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help whitespace-nowrap">
                <Award size={14} /> Punkty honoru: {warrior?.ph}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              <p>Otrzymane lub stracone punkty honoru</p>
            </TooltipContent>
          </Tooltip>
        )}

        {battle.hasFlee && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help whitespace-nowrap">
                <EmergencyExitIcon size={14} /> Ucieczka
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              <p>Walka przerwana przez ucieczkę</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
