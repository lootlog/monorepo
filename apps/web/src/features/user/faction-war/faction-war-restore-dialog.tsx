import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lootlog/ui/components/alert-dialog";
import { Button } from "@lootlog/ui/components/button";
import { getFactionWarModerationErrorKey } from "./faction-war-moderation-error";
import {
  useRestoreFactionWarPlayer,
  type FactionWarDisqualification,
} from "./faction-war-queries";

type FactionWarRestoreDialogProps = {
  warId: string;
  player: Pick<FactionWarDisqualification, "userId" | "characterName">;
  onClose: () => void;
};

/** Lifts a disqualification once the admin confirms it. */
export const FactionWarRestoreDialog = ({
  warId,
  player,
  onClose,
}: FactionWarRestoreDialogProps) => {
  const { t } = useTranslation();
  const restore = useRestoreFactionWarPlayer();
  const name = player.characterName;

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !restore.isPending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("factionWar.moderation.restoreDialog.title", { name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("factionWar.moderation.restoreDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={restore.isPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={restore.isPending}
            render=<Button loading={restore.isPending} />
            onClick={(event) => {
              event.preventBaseUIHandler();

              if (restore.isPending) return;

              restore.mutate(
                { pathParams: { warId, userId: player.userId } },
                {
                  onSuccess: () => {
                    onClose();
                    toast.success(
                      t("factionWar.moderation.restored", { name }),
                      {
                        description: t("factionWar.moderation.refreshDelay"),
                      },
                    );
                  },
                  onError: (error) =>
                    toast.error(t(getFactionWarModerationErrorKey(error))),
                },
              );
            }}
          >
            {t("factionWar.moderation.restore")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
