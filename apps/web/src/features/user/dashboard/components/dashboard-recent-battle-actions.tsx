import type { BattlesListResponseDtoOutputBattlesItem } from "@lootlog/client/battlelog";
import type { useBattleTableActions } from "@/features/user/battle-panel/battle-panel-battles-list/hooks/use-battle-table-actions";
import { Button } from "@lootlog/ui/components/button";
import { Separator } from "@lootlog/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Copy, Lock, Share2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";

export function DashboardRecentBattleActions({
  battle,
  actions,
}: {
  battle: BattlesListResponseDtoOutputBattlesItem;
  actions: ReturnType<typeof useBattleTableActions>;
}) {
  const { t } = useTranslation();
  const shareAction = battle.public
    ? {
        key: "copyLink",
        icon: Copy,
        onClick: () => actions.handleCopyLink(battle.id),
      }
    : {
        key: "share",
        icon: Share2,
        onClick: () => actions.handleShare(battle.id),
      };
  const buttons = [
    shareAction,
    ...(battle.public
      ? [
          {
            key: "hide",
            icon: Lock,
            onClick: () => actions.handleUnshare(battle.id),
          },
        ]
      : []),
    {
      key: "delete",
      icon: Trash2,
      onClick: () => actions.setSingleDeleteBattle(battle),
    },
  ];
  return (
    <div className="flex shrink-0 items-center gap-0.5 pr-2">
      <Separator
        orientation="vertical"
        className="mr-1 self-center data-[orientation=vertical]:h-8"
      />
      {buttons.map(({ key, icon: Icon, onClick }) => (
        <Tooltip key={key}>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t(`battlePanel.actions.${key}`)}
                disabled={actions.isRowActionBusy}
                onClick={onClick}
                className={cn(
                  "size-8",
                  key === "delete"
                    ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                )}
              >
                <Icon className="size-3.5" />
              </Button>
            }
          />
          <TooltipContent sideOffset={4}>
            {t(`battlePanel.actions.${key}`)}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
