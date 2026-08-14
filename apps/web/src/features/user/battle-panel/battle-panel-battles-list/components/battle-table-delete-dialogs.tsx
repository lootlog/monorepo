import type { Battle } from "@/lib/api/battlelog-types";
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
import { useTranslation } from "react-i18next";
import { stopBattleTableAction } from "./battle-table-events";

type BattleTableDeleteDialogsProps = {
  isBulkDeleteDialogOpen: boolean;
  isDeletePending: boolean;
  onBulkDelete: () => void;
  onBulkDeleteOpenChange: (open: boolean) => void;
  onSingleDelete: () => void;
  onSingleDeleteOpenChange: (open: boolean) => void;
  selectedCount: number;
  singleDeleteBattle: Battle | null;
};

export const BattleTableDeleteDialogs = ({
  isBulkDeleteDialogOpen,
  isDeletePending,
  onBulkDelete,
  onBulkDeleteOpenChange,
  onSingleDelete,
  onSingleDeleteOpenChange,
  selectedCount,
  singleDeleteBattle,
}: BattleTableDeleteDialogsProps) => {
  const { t } = useTranslation();

  return (
    <>
      <AlertDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={onBulkDeleteOpenChange}
      >
        <AlertDialogContent onClick={stopBattleTableAction}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("battlePanel.bulk.deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("battlePanel.bulk.deleteDialog.description", {
                count: selectedCount,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              render={
                <Button
                  variant="destructive"
                  onClick={onBulkDelete}
                  disabled={isDeletePending}
                >
                  {t("battlePanel.bulk.deleteDialog.confirm")}
                </Button>
              }
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(singleDeleteBattle)}
        onOpenChange={onSingleDeleteOpenChange}
      >
        <AlertDialogContent onClick={stopBattleTableAction}>
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
                  onClick={onSingleDelete}
                  disabled={isDeletePending}
                >
                  {t("battlePanel.dialogs.deleteBattle.confirm")}
                </Button>
              }
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
