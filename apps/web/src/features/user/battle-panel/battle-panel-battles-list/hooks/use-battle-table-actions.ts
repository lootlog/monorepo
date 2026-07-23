import { BATTLELOG_PUBLIC_URL } from "@/config/addon";
import { useBattleSharing } from "@/features/user/battle-panel/battle-panel-single-battle/hooks/use-battle-sharing";
import type { Battle } from "@/lib/api/battlelog-types";
import {
  invalidateBattlesControllerGetBattle,
  invalidateBattlesControllerGetDashboardBattles,
  useBattlesControllerDeleteBattle,
  useBattlesControllerUpdateBattle,
} from "@lootlog/api-client/react-query/battlelog/battles";
import {
  invalidatePublicBattlesControllerGetPublicBattle,
  invalidatePublicBattlesControllerGetPublicBattleRaw,
  invalidatePublicBattlesControllerGetPublicBattleTimeline,
} from "@lootlog/api-client/react-query/battlelog/public-battles";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  const { handleShare, handleCopyLink, handleUnshare, isPending } =
    useBattleSharing();
  const { mutateAsync: updateBattle, isPending: isBulkSharePending } =
    useBattlesControllerUpdateBattle();
  const {
    mutate: deleteBattle,
    mutateAsync: deleteBattleAsync,
    isPending: isDeletePending,
  } = useBattlesControllerDeleteBattle();
  const [singleDeleteBattle, setSingleDeleteBattle] = useState<Battle | null>(
    null,
  );
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const isBulkBusy = isBulkSharePending || isDeletePending;
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

  const handleBulkShare = async () => {
    if (selectedBattles.length === 0) {
      return;
    }

    const privateBattles = selectedBattles.filter((battle) => !battle.public);

    try {
      await Promise.all(
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

  const handleBulkDelete = async () => {
    if (selectedBattles.length === 0) {
      return;
    }

    try {
      await Promise.all(
        selectedBattles.map((battle) =>
          deleteBattleAsync({
            pathParams: { battleId: battle.id },
          }),
        ),
      );
      await invalidateBattleVisibilityQueries(
        selectedBattles.map((battle) => battle.id),
      );
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

  const handleSingleDelete = () => {
    if (!singleDeleteBattle) {
      return;
    }

    deleteBattle(
      {
        pathParams: {
          battleId: singleDeleteBattle.id,
        },
      },
      {
        onSuccess: async () => {
          await invalidateBattleVisibilityQueries([singleDeleteBattle.id]);
          toast.success(t("battlePanel.toasts.battleDeleted"), {
            duration: 3000,
          });
          removeBattleFromSelection(singleDeleteBattle.id);
          setSingleDeleteBattle(null);
        },
        onError: () => {
          toast.error(t("battlePanel.toasts.battleDeleteError"), {
            duration: 3000,
          });
        },
      },
    );
  };

  return {
    handleBulkDelete,
    handleBulkShare,
    handleCopyLink,
    handleShare,
    handleSingleDelete,
    handleUnshare,
    isBulkBusy,
    isBulkDeleteDialogOpen,
    isDeletePending,
    isRowActionBusy,
    setIsBulkDeleteDialogOpen,
    setSingleDeleteBattle,
    singleDeleteBattle,
  };
};
