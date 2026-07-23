import { Button } from "@lootlog/ui/components/button";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useQueryClient } from "@tanstack/react-query";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { Loot } from "@/lib/loots/loot-types";
import {
  invalidateLootsControllerFetchLootById,
  useLootsControllerDeleteLoot,
} from "@lootlog/api-client/react-query/main/loots";

export type LootDetailsActionsProps = {
  loot: Loot;
};

export const LootDetailsActions: FC<LootDetailsActionsProps> = ({ loot }) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { mutate: deleteLoot, isPending } = useLootsControllerDeleteLoot({
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

  const handleLootDelete = () => {
    if (!guildId) {
      return;
    }

    deleteLoot({
      pathParams: { guildId, lootId: loot.id },
    });
  };

  return (
    <div className="flex justify-start items-center gap-2">
      <Button
        variant="destructive"
        className="h-8 w-16"
        onClick={handleLootDelete}
      >
        {isPending ? <Spinner className="h-4 w-4" /> : t("common.delete")}
      </Button>
    </div>
  );
};
