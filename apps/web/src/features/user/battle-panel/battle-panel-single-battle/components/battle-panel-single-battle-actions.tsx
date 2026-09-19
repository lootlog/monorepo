import type { Battle } from "@/lib/api/battlelog-types";
import { ROUTES } from "@/config/routes";
import { useBattleSharing } from "../hooks/use-battle-sharing";
import {
  invalidateBattlesControllerGetBattle,
  invalidateBattlesControllerGetBattleRawData,
  invalidateBattlesControllerGetDashboardBattles,
  useBattlesControllerDeleteBattle,
  invalidatePublicBattlesControllerGetPublicBattle,
  invalidatePublicBattlesControllerGetPublicBattleRaw,
  invalidatePublicBattlesControllerGetPublicBattleTimeline,
} from "@lootlog/client/battlelog";

import { Button } from "@lootlog/ui/components/button";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Copy, Lock, Share2, Trash2 } from "lucide-react";
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
  const isBusy = isPending || isDeletePending;

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
        await Promise.all([
          invalidateBattlesControllerGetDashboardBattles(queryClient),
          invalidateBattlesControllerGetBattle(queryClient, {
            battleId: battle.id,
          }),
          invalidateBattlesControllerGetBattleRawData(queryClient, {
            battleId: battle.id,
          }),
          invalidatePublicBattlesControllerGetPublicBattle(queryClient, {
            battleId: battle.id,
          }),
          invalidatePublicBattlesControllerGetPublicBattleRaw(queryClient, {
            battleId: battle.id,
          }),
          invalidatePublicBattlesControllerGetPublicBattleTimeline(
            queryClient,
            {
              battleId: battle.id,
            },
          ),
        ]);
        toast.success(t("battlePanel.toasts.battleDeleted"), {
          duration: 3000,
        });
        await navigate({ to: ROUTES.user.battlePanel.base });
      } catch (error) {
        toast.error(t("battlePanel.toasts.battleDeleteError"), {
          duration: 3000,
        });
        throw error;
      }
    })().finally(() => {
      setIsDeletePending(false);
    });
  };

  return (
    <div className="flex items-center gap-1">
      <RecentOpponentBattlesDialog battle={battle} className="xl:hidden" />

      {battle.public ? (
        <>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={t("battlePanel.actions.copyLink")}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopyClick}
                  loading={pendingAction?.action === "copy"}
                  disabled={isBusy}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <TooltipContent>{t("battlePanel.actions.copyLink")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={t("battlePanel.actions.hide")}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleUnshareClick}
                  loading={pendingAction?.action === "unshare"}
                  disabled={isBusy}
                >
                  <Lock className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <TooltipContent>{t("battlePanel.actions.hide")}</TooltipContent>
          </Tooltip>
        </>
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={t("battlePanel.actions.share")}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleShareClick}
                loading={pendingAction?.action === "share"}
                disabled={isBusy}
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <TooltipContent>{t("battlePanel.actions.share")}</TooltipContent>
        </Tooltip>
      )}

      <ConfirmDeleteDialog
        onConfirm={handleDeleteClick}
        disabled={isBusy}
        title={t("battlePanel.dialogs.deleteBattle.title")}
        description={t("battlePanel.dialogs.deleteBattle.description")}
        confirmButtonLabel={t("battlePanel.dialogs.deleteBattle.confirm")}
        cancelButtonLabel={t("common.cancel")}
        triggerTooltip={t("battlePanel.actions.delete")}
        trigger={
          <Button
            aria-label={t("battlePanel.actions.delete")}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        }
      />
    </div>
  );
};
