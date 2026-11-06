import type { Battle } from "@/lib/api/battlelog-types";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { useTranslation } from "react-i18next";

type BattleTableDeleteDialogsProps = {
  isBulkDeleteDialogOpen: boolean;
  /** Another table action is running, so deleting must wait. */
  isBusy: boolean;
  isDeletePending: boolean;
  /** Rejects to keep the dialog open, as after a failed request. */
  onBulkDelete: () => Promise<void>;
  onBulkDeleteOpenChange: (open: boolean) => void;
  /** Rejects to keep the dialog open, as after a failed request. */
  onSingleDelete: () => Promise<void>;
  onSingleDeleteOpenChange: (open: boolean) => void;
  selectedCount: number;
  singleDeleteBattle: Battle | null;
};

export const BattleTableDeleteDialogs = ({
  isBulkDeleteDialogOpen,
  isBusy,
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
      <ConfirmDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={onBulkDeleteOpenChange}
        title={t("battlePanel.bulk.deleteDialog.title")}
        description={t("battlePanel.bulk.deleteDialog.description", {
          count: selectedCount,
        })}
        confirmButtonLabel={t("battlePanel.bulk.deleteDialog.confirm")}
        cancelButtonLabel={t("common.cancel")}
        disabled={isBusy}
        pending={isDeletePending}
        onConfirm={onBulkDelete}
      />
      <ConfirmDialog
        open={Boolean(singleDeleteBattle)}
        onOpenChange={onSingleDeleteOpenChange}
        title={t("battlePanel.dialogs.deleteBattle.title")}
        description={t("battlePanel.dialogs.deleteBattle.description")}
        confirmButtonLabel={t("battlePanel.dialogs.deleteBattle.confirm")}
        cancelButtonLabel={t("common.cancel")}
        disabled={isBusy}
        pending={isDeletePending}
        onConfirm={onSingleDelete}
      />
    </>
  );
};
