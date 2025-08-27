import { useDeleteLoot } from "@/hooks/api/use-delete-loot";
import { Loot } from "@/hooks/api/use-loots";
import { Button } from "@lootlog/ui/components/button";
import { Loader2 } from "lucide-react";
import { FC } from "react";

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
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Usuń"}
      </Button>
    </div>
  );
};
