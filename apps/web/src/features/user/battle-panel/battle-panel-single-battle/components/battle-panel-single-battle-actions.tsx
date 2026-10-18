import { createBattleVisibilityInvalidations } from "../../battle-visibility-queries";
import type { Battle } from "@/lib/api/battlelog-types";
import { ROUTES } from "@/config/routes";
import { useBattleSharing } from "../hooks/use-battle-sharing";
import {
  invalidateBattlesControllerGetBattleRawData,
  useBattlesControllerDeleteBattle,
} from "@lootlog/client/battlelog";

import { DETAIL_BAR_TOOLBAR_CELL_CLASS } from "@/components/common/detail-bar";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Copy, Lock, MoreHorizontal, Share2, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RecentOpponentBattlesDialog } from "./recent-opponent-battles-dialog";

export type BattlePanelSingleBattleActionsProps = {
  battle: Battle;
};

export const BattlePanelSingleBattleActions: FC<
  BattlePanelSingleBattleActionsProps
> = ({ battle }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    handleShare,
    handleCopyLink,
    handleUnshare,
    isPending,
    pendingAction,
  } = useBattleSharing();

  const { mutateAsync: deleteBattle } = useBattlesControllerDeleteBattle();
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletedBattleId, setDeletedBattleId] = useState<string | null>(null);
  const isBusy = isPending || isDeletePending || deletedBattleId === battle.id;

  const handleShareClick = () => {
    handleShare(battle.id);
  };

  const handleCopyClick = () => {
    handleCopyLink(battle.id);
  };

  const handleUnshareClick = () => {
    handleUnshare(battle.id);
  };

  const handleDeleteClick = async () => {
    if (isBusy) return;
    setIsDeletePending(true);

    await (async () => {
      try {
        await deleteBattle({ pathParams: { battleId: battle.id } });
      } catch (error) {
        toast.error(t("battlePanel.toasts.battleDeleteError"), {
          duration: 3000,
        });
        throw error;
      }

      setDeletedBattleId(battle.id);
      toast.success(t("battlePanel.toasts.battleDeleted"), {
        duration: 3000,
      });

      try {
        await Promise.allSettled([
          ...createBattleVisibilityInvalidations(queryClient, [battle.id]),
          invalidateBattlesControllerGetBattleRawData(queryClient, {
            battleId: battle.id,
          }),
        ]);
        await navigate({ to: ROUTES.user.battlePanel.base });
      } catch {
        // The battle is already deleted; navigation failure must not offer a retry.
      }
    })().finally(() => {
      setIsDeletePending(false);
    });
  };

  return (
    <>
      <RecentOpponentBattlesDialog battle={battle} className="xl:hidden" />

      {battle.public ? (
        <Button
          size="lg"
          variant="chip"
          className={DETAIL_BAR_TOOLBAR_CELL_CLASS}
          onClick={handleCopyClick}
          loading={pendingAction?.action === "copy"}
          disabled={isBusy}
        >
          <Copy className="size-4" />
          {t("battlePanel.actions.copyLink")}
        </Button>
      ) : (
        <Button
          size="lg"
          variant="chip"
          className={DETAIL_BAR_TOOLBAR_CELL_CLASS}
          onClick={handleShareClick}
          loading={pendingAction?.action === "share"}
          disabled={isBusy}
        >
          <Share2 className="size-4" />
          {t("battlePanel.actions.share")}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-lg"
              variant="chip"
              className={DETAIL_BAR_TOOLBAR_CELL_CLASS}
              aria-label={t("battlePanel.actions.more")}
              disabled={isBusy}
            >
              <MoreHorizontal className="size-4" />
              <span className="hidden @max-[36rem]/detail-bar:inline">
                {t("battlePanel.actions.moreShort")}
              </span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          {battle.public ? (
            <>
              <DropdownMenuItem onClick={handleUnshareClick}>
                <Lock className="size-4" />
                {t("battlePanel.actions.hide")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="size-4" />
            {t("battlePanel.actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteClick}
        disabled={isBusy}
        title={t("battlePanel.dialogs.deleteBattle.title")}
        description={t("battlePanel.dialogs.deleteBattle.description")}
        confirmButtonLabel={t("battlePanel.dialogs.deleteBattle.confirm")}
        cancelButtonLabel={t("common.cancel")}
      />
    </>
  );
};
