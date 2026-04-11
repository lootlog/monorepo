import { useDeleteLoot } from "@/hooks/api/loots/use-delete-loot";
import type { Loot } from "@/hooks/api/loots/use-loots";
import { Button } from "@lootlog/ui/components/button";
import { Spinner } from "@lootlog/ui/components/spinner";
import type { FC } from "react";

export type LootDetailsActionsProps = {
  loot: Loot;
};

export const LootDetailsActions: FC<LootDetailsActionsProps> = ({ loot }) => {
  const { mutate: deleteLoot, isPending } = useDeleteLoot();

  const handleLootDelete = () => {
    deleteLoot({ lootId: loot.id });
  };

  return (
    <div className="flex justify-start items-center gap-2">
      <Button
        variant="destructive"
        className="h-8 w-16"
        onClick={handleLootDelete}
      >
        {isPending ? <Spinner className="h-4 w-4" /> : "Usuń"}
      </Button>
    </div>
  );
};
