import type { Battle } from "@/lib/api/battlelog-types";
import { ROUTES } from "@/config/routes";
import { useBattleSharing } from "../hooks/use-battle-sharing";
import {
  invalidateBattlesControllerGetBattle,
  invalidateBattlesControllerGetBattleRawData,
  invalidateBattlesControllerGetDashboardBattles,
  useBattlesControllerDeleteBattle,
} from "@lootlog/client/battlelog";
import {
  invalidatePublicBattlesControllerGetPublicBattle,
  invalidatePublicBattlesControllerGetPublicBattleRaw,
  invalidatePublicBattlesControllerGetPublicBattleTimeline,
} from "@lootlog/client/battlelog";
import { Button } from "@lootlog/ui/components/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@lootlog/ui/components/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Copy, Lock, Share2, Trash2 } from "lucide-react";
import type { FC } from "react";
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
  const { handleShare, handleCopyLink, handleUnshare, isPending } =
    useBattleSharing();
  const { mutate: deleteBattle, isPending: isDeletePending } =
    useBattlesControllerDeleteBattle();
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

  const handleDeleteClick = () => {
    deleteBattle(
      {
        pathParams: {
          battleId: battle.id,
        },
      },
      {
        onSuccess: async () => {
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
          navigate({ to: ROUTES.user.battlePanel.base });
        },
        onError: () => {
          toast.error(t("battlePanel.toasts.battleDeleteError"), {
            duration: 3000,
          });
        },
      },
    );
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
                disabled={isBusy}
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <TooltipContent>{t("battlePanel.actions.share")}</TooltipContent>
        </Tooltip>
      )}

      <AlertDialog>
        <Tooltip>
          <TooltipTrigger
            render={
              <AlertDialogTrigger
                render={
                  <Button
                    aria-label={t("battlePanel.actions.delete")}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={isBusy}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                }
              />
            }
          />
          <TooltipContent>{t("battlePanel.actions.delete")}</TooltipContent>
        </Tooltip>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("battlePanel.dialogs.deleteBattle.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("battlePanel.dialogs.deleteBattle.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              render={
                <Button
                  variant="destructive"
                  onClick={handleDeleteClick}
                  disabled={isBusy}
                >
                  {t("battlePanel.dialogs.deleteBattle.confirm")}
                </Button>
              }
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
