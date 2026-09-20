import { Button } from "@lootlog/ui/components/button";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { Loot } from "@/lib/loots/loot-types";
import {
  invalidateLootsControllerFetchLootById,
  useLootsControllerDeleteLoot,
} from "@lootlog/client/main";

export type LootDetailsActionsProps = {
  loot: Loot;
  onDeleted?: () => void;
};

export const LootDetailsActions: FC<LootDetailsActionsProps> = ({
  loot,
  onDeleted,
}) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  const { mutateAsync: deleteLoot, isPending } = useLootsControllerDeleteLoot({
    mutation: {
      onSuccess: async () => {
        if (!guildId) {
          return;
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [`/guilds/${guildId}/loots`],
            exact: false,
          }),
          invalidateLootsControllerFetchLootById(queryClient, {
            guildId,
            lootId: loot.id,
          }),
        ]);
      },
    },
  });

  const handleLootDelete = async () => {
    if (!guildId || isPending) {
      return;
    }

    await deleteLoot({
      pathParams: { guildId, lootId: loot.id },
    });

    onDeleted?.();
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <ConfirmDeleteDialog
        title={t("loots.details.delete.title")}
        description={t("loots.details.delete.description")}
        confirmButtonLabel={t("common.delete")}
        cancelButtonLabel={t("common.cancel")}
        onConfirm={handleLootDelete}
        trigger={
          <Button
            variant="destructive"
            size="sm"
            className="h-8 px-2.5 text-xs"
            icon={<Trash2 className="size-3.5" />}
          >
            {t("common.delete")}
          </Button>
        }
      />
    </div>
  );
};
