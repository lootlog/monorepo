import { useToast } from "@/components/ui/use-toast";
import { Loot } from "@/hooks/api/use-loots";
import { ItemTile } from "@/screens/guild/components/loots-list/item-tile";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Copy } from "lucide-react";
import { FC, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";

export type LootDetailsProps = {
  loot: Loot;
  ownerMap?: Record<string, string | undefined>;
};

export const LootDetails: FC<LootDetailsProps> = ({ loot, ownerMap }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleCopyId = (id: string) => {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        toast({
          title: "ID skopiowane",
          description: `ID zostało skopiowane do schowka.`,
        });
      })
      .catch(() => {
        toast({
          title: "Błąd kopiowania",
          description: "Nie udało się skopiować ID. Spróbuj ponownie.",
        });
      });
  };

  const items = loot?.items || [];
  const showCollapsible = items.length > 3;
  const visibleItems = showCollapsible ? items.slice(0, 3) : items;
  const hiddenItems = showCollapsible ? items.slice(3) : [];

  return (
    <div>
      {visibleItems.map((item) => {
        const ownerId = ownerMap?.[item.hid];
        const owner = ownerId
          ? loot.players.find((p) => p.id === ownerId)?.name
          : undefined;

        return (
          <div
            key={item.hid}
            className="flex gap-4 items-start w-full border-b p-4"
          >
            <ItemTile item={item} />
            <div className="flex flex-col flex-1">
              <span className="text-sm font-medium">{item.name}</span>
              {owner && (
                <span className="text-xs text-muted-foreground">
                  Zdobyto przez: {owner}
                </span>
              )}
              <div className="w-full flex mt-2 gap-1">
                <Input
                  className="h-6 px-2 !text-xs"
                  value={item.hid}
                  readOnly
                />
                <Button
                  size="icon"
                  className="h-6"
                  variant="ghost"
                  onClick={() => handleCopyId(item.hid)}
                >
                  <Copy />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {showCollapsible && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleContent>
            {hiddenItems.map((item) => {
              const ownerId = ownerMap?.[item.hid];
              const owner = ownerId
                ? loot.players.find((p) => p.id === ownerId)?.name
                : undefined;

              return (
                <div
                  key={item.hid}
                  className="flex gap-4 items-start w-full border-b p-4"
                >
                  <ItemTile item={item} />
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-medium">{item.name}</span>
                    {owner && (
                      <span className="text-xs text-muted-foreground">
                        Zdobyto przez: {owner}
                      </span>
                    )}
                    <div className="w-full flex mt-2 gap-1">
                      <Input
                        className="h-6 px-2 !text-xs"
                        value={item.hid}
                        readOnly
                      />
                      <Button
                        size="icon"
                        className="h-6"
                        variant="ghost"
                        onClick={() => handleCopyId(item.hid)}
                      >
                        <Copy />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full mt-2">
              {open ? "Pokaż mniej" : `Pokaż więcej (${hiddenItems.length})`}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      )}
    </div>
  );
};
