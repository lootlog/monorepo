import type { Battle } from "@/lib/api/battlelog-types";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { Copy, Lock, MoreHorizontal, Share2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  stopBattleTableAction,
  stopBattleTableKeyboardAction,
} from "./battle-table-events";

type BattleTableActionsMenuProps = {
  battle: Battle;
  disabled?: boolean;
  onCopyLink: (battleId: string) => void;
  onDelete: (battle: Battle) => void;
  onShare: (battleId: string) => void;
  onUnshare: (battleId: string) => void;
};

export const BattleTableActionsMenu = ({
  battle,
  disabled,
  onCopyLink,
  onDelete,
  onShare,
  onUnshare,
}: BattleTableActionsMenuProps) => {
  const { t } = useTranslation();

  return (
    <div
      data-battle-table-action
      className="flex justify-end"
      onClick={stopBattleTableAction}
      onKeyDown={stopBattleTableKeyboardAction}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={t("battlePanel.actions.more")}
            variant="ghost"
            size="icon"
            className="size-7 md:size-8"
            disabled={disabled}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {battle.public ? (
            <>
              <DropdownMenuItem onSelect={() => onCopyLink(battle.id)}>
                <Copy className="size-4" />
                {t("battlePanel.actions.copyLink")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onUnshare(battle.id)}>
                <Lock className="size-4" />
                {t("battlePanel.actions.hide")}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onSelect={() => onShare(battle.id)}>
              <Share2 className="size-4" />
              {t("battlePanel.actions.share")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => onDelete(battle)}
          >
            <Trash2 className="size-4" />
            {t("battlePanel.actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
