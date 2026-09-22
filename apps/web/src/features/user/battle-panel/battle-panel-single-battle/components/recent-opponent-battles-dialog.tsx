import type { Battle } from "@/lib/api/battlelog-types";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@lootlog/ui/components/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
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
        <TooltipTrigger
          render=<DialogTrigger
            render={
              <Button
                aria-label={t("battlePanel.single.recentOpponent.openDialog")}
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", className)}
              >
                <History className="h-3.5 w-3.5" />
              </Button>
            }
          />
        />
        <TooltipContent>
          {t("battlePanel.single.recentOpponent.openDialog")}
        </TooltipContent>
      </Tooltip>
      <DialogContent className="max-h-[85dvh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("battlePanel.single.recentOpponent.title")}
          </DialogTitle>
          <DialogDescription className="truncate">
            {t("battlePanel.single.recentOpponent.subtitle", {
              opponentLevel: context.opponentLvl,
              opponentName: context.opponentName,
              opponentProf: context.opponentProf,
              userLevel: context.userLvl,
              userName: context.userName,
              userProf: context.userProf,
            })}
          </DialogDescription>
        </DialogHeader>
        <RecentOpponentBattlesList battle={battle} />
      </DialogContent>
    </Dialog>
  );
}
