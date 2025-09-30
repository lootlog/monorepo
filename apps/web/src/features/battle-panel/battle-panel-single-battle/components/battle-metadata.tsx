import { Battle } from "@/hooks/api/battle-log/use-battles";
import { formatSeconds } from "@/utils/date/format-seconds";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { format } from "date-fns";
import { Calendar, Clock, Lock, Unlock, Users } from "lucide-react";
import { FC } from "react";

export type BattleMetadataProps = {
  battle: Battle;
};

export const BattleMetadata: FC<BattleMetadataProps> = ({ battle }) => {
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
            <p>Data i godzina rozpoczęcia walki</p>
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
            <p>Czas trwania walki</p>
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
            <p>Typ walki</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              {battle.public ? <Unlock size="14" /> : <Lock size="14" />}
              {battle.public ? "Publiczna" : "Prywatna"}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p>
              {battle.public
                ? "Walka jest publiczna - może być przeglądana przez osoby posiadające link"
                : "Walka jest prywatna - tylko Ty możesz ją zobaczyć"}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
