import { BATTLELOG_PUBLIC_URL } from "@/config/addon";
import { useBattleSharing } from "@/features/user/battle-panel/battle-panel-single-battle/hooks/use-battle-sharing";
import type { Battle } from "@/lib/api/battlelog-types";
import {
  invalidateBattlesControllerGetBattle,
  invalidateBattlesControllerGetDashboardBattles,
  useBattlesControllerDeleteBattle,
  useBattlesControllerUpdateBattle,
} from "@lootlog/client/battlelog";
import {
  invalidatePublicBattlesControllerGetPublicBattle,
  invalidatePublicBattlesControllerGetPublicBattleRaw,
  invalidatePublicBattlesControllerGetPublicBattleTimeline,
} from "@lootlog/client/battlelog";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

type UseBattleTableActionsParams = {
  clearSelection: () => void;
  removeBattleFromSelection: (battleId: string) => void;
  selectedBattles: Battle[];
};

const composeBattleUrl = (battleId: string) =>
  `${BATTLELOG_PUBLIC_URL}/battles/${battleId}`;

export const useBattleTableActions = ({
  clearSelection,
  removeBattleFromSelection,
  selectedBattles,
}: UseBattleTableActionsParams) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [, copy] = useCopyToClipboard();
  const {
    handleShare,
    handleCopyLink,
    handleUnshare,
    isPending,
    pendingAction,
  } = useBattleSharing();
  const { mutateAsync: updateBattle } = useBattlesControllerUpdateBattle();
  const { mutateAsync: deleteBattleAsync } = useBattlesControllerDeleteBattle();
  const [pendingOperation, setPendingOperation] = useState<
    "share" | "delete" | "singleDelete" | null
  >(null);
  const operationBusy = useRef(false);
  const [singleDeleteBattle, setSingleDeleteBattle] = useState<Battle | null>(
    null,
  );
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const isDeletePending =
    pendingOperation === "delete" || pendingOperation === "singleDelete";
  const isBulkBusy = pendingOperation !== null;
  const isRowActionBusy = isPending || isBulkBusy;

  const invalidateBattleVisibilityQueries = async (battleIds: string[]) => {
    const invalidationPromises: Promise<unknown>[] = [
      invalidateBattlesControllerGetDashboardBattles(queryClient),
    ];

    for (const battleId of battleIds) {
      invalidationPromises.push(
        invalidateBattlesControllerGetBattle(queryClient, { battleId }),
        invalidatePublicBattlesControllerGetPublicBattle(queryClient, {
          battleId,
        }),
        invalidatePublicBattlesControllerGetPublicBattleRaw(queryClient, {
          battleId,
        }),
        invalidatePublicBattlesControllerGetPublicBattleTimeline(queryClient, {
          battleId,
        }),
      );
    }

    await Promise.all(invalidationPromises);
  };

  const shareSelectedBattles = async () => {
    if (selectedBattles.length === 0) {
      return;
    }

    const privateBattles = selectedBattles.filter((battle) => !battle.public);

    try {
      const results = await Promise.allSettled(
        privateBattles.map((battle) =>
          updateBattle({
            pathParams: { battleId: battle.id },
            data: { public: true },
          }),
        ),
      );

      if (privateBattles.length > 0) {
        await invalidateBattleVisibilityQueries(
          privateBattles.map((battle) => battle.id),
        );
      }
      if (results.some((result) => result.status === "rejected")) {
        toast.error(t("battlePanel.toasts.bulkBattleShareError"), {
          duration: 3000,
        });
        return;
      }
    } catch {
      toast.error(t("battlePanel.toasts.bulkBattleShareError"), {
        duration: 3000,
      });
      return;
    }

    try {
      const links = selectedBattles
        .map((battle) => composeBattleUrl(battle.id))
        .join(", ");
      const copied = await copy(links);

      if (!copied) {
        toast.error(t("battlePanel.toasts.linkCopyError"), {
          duration: 3000,
        });
        return;
      }

      toast.success(
        t("battlePanel.toasts.bulkBattlesShared", {
          count: selectedBattles.length,
        }),
        {
          duration: 3000,
        },
      );
    } catch {
      toast.error(t("battlePanel.toasts.linkCopyError"), {
        duration: 3000,
      });
    }
  };

  const deleteSelectedBattles = async () => {
    if (selectedBattles.length === 0) {
      return;
    }

    try {
      const results = await Promise.allSettled(
        selectedBattles.map((battle) =>
          deleteBattleAsync({
            pathParams: { battleId: battle.id },
          }),
        ),
      );
      await invalidateBattleVisibilityQueries(
        selectedBattles.map((battle) => battle.id),
      );
      results.forEach((result, index) => {
        const battle = selectedBattles[index];
        if (result.status === "fulfilled" && battle)
          removeBattleFromSelection(battle.id);
      });
      if (results.some((result) => result.status === "rejected")) {
        toast.error(t("battlePanel.toasts.bulkBattleDeleteError"), {
          duration: 3000,
        });
        return;
      }
      toast.success(
        t("battlePanel.toasts.bulkBattlesDeleted", {
          count: selectedBattles.length,
        }),
        {
          duration: 3000,
        },
      );
      clearSelection();
      setIsBulkDeleteDialogOpen(false);
    } catch {
      toast.error(t("battlePanel.toasts.bulkBattleDeleteError"), {
        duration: 3000,
      });
    }
  };

  const deleteSingleBattle = async () => {
    if (!singleDeleteBattle) return;
    try {
      await deleteBattleAsync({
        pathParams: { battleId: singleDeleteBattle.id },
      });
      await invalidateBattleVisibilityQueries([singleDeleteBattle.id]);
      toast.success(t("battlePanel.toasts.battleDeleted"), { duration: 3000 });
      removeBattleFromSelection(singleDeleteBattle.id);
      setSingleDeleteBattle(null);
    } catch {
      toast.error(t("battlePanel.toasts.battleDeleteError"), {
        duration: 3000,
      });
    }
  };

  const runOperation = async (
    operation: "share" | "delete" | "singleDelete",
    action: () => Promise<void>,
  ) => {
    if (operationBusy.current || isPending) return;
    operationBusy.current = true;
    setPendingOperation(operation);
    await Promise.resolve()
      .then(action)
      .finally(() => {
        operationBusy.current = false;
        setPendingOperation(null);
      });
  };
  const handleBulkShare = () => runOperation("share", shareSelectedBattles);
  const handleBulkDelete = () => runOperation("delete", deleteSelectedBattles);
  const handleSingleDelete = () =>
    runOperation("singleDelete", deleteSingleBattle);

  return {
    handleBulkDelete,
    handleBulkShare,
    handleCopyLink,
    handleShare,
    handleSingleDelete,
    handleUnshare,
    isBulkBusy,
    isBulkSharePending: pendingOperation === "share",
    pendingBattleId: pendingAction?.battleId,
    isBulkDeleteDialogOpen,
    isDeletePending,
    isRowActionBusy,
    setIsBulkDeleteDialogOpen,
    setSingleDeleteBattle,
    singleDeleteBattle,
  };
};
