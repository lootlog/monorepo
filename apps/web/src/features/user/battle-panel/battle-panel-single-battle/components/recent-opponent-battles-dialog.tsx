import type { Battle } from "@/lib/api/battlelog-types";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@lootlog/ui/components/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getRecentOpponentBattleContext } from "./recent-opponent-battle-context";
import { RecentOpponentBattlesList } from "./recent-opponent-battles-list";

type RecentOpponentBattlesDialogProps = {
  battle: Battle;
  className?: string;
};

export function RecentOpponentBattlesDialog({
  battle,
  className,
}: RecentOpponentBattlesDialogProps) {
  const { t } = useTranslation();
  const context = getRecentOpponentBattleContext(battle);

  if (!context) {
    return null;
  }

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              aria-label={t("battlePanel.single.recentOpponent.openDialog")}
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", className)}
            >
              <History className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {t("battlePanel.single.recentOpponent.openDialog")}
        </TooltipContent>
      </Tooltip>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-base">
            {t("battlePanel.single.recentOpponent.title")}
          </DialogTitle>
          <p className="truncate text-sm text-muted-foreground">
            {t("battlePanel.single.recentOpponent.subtitle", {
              opponentLevel: context.opponentLvl,
              opponentName: context.opponentName,
              opponentProf: context.opponentProf,
              userLevel: context.userLvl,
              userName: context.userName,
              userProf: context.userProf,
            })}
          </p>
        </DialogHeader>
        <RecentOpponentBattlesList
          battle={battle}
          className="max-h-[calc(85dvh-72px)]"
        />
      </DialogContent>
    </Dialog>
  );
}
