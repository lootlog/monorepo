import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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

  // Deleting stays behind a menu, away from the everyday controls beside it.
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("loots.details.moreActions")}
              title={t("loots.details.moreActions")}
              loading={isPending}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setIsConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
            {t("loots.details.delete.action")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDeleteDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={t("loots.details.delete.title")}
        description={t("loots.details.delete.description")}
        confirmButtonLabel={t("common.delete")}
        cancelButtonLabel={t("common.cancel")}
        onConfirm={handleLootDelete}
      />
    </>
  );
};
