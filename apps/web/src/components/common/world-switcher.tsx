import { useWorlds } from "@/hooks/api/game-data/use-worlds";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useEffect, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { cn } from "@lootlog/ui/lib/utils";

type WorldSwitcherProps = {
  className?: string;
};

export const WorldSwitcher: React.FC<WorldSwitcherProps> = ({ className }) => {
  const { data: worlds } = useWorlds();
  const { setWorld, world } = useGuildContext();
  const guildId = useGuildId();
  const storageKey = `lootlog:guild:${guildId ?? "global"}:world-order`;
  const [worldOrder, setWorldOrder] = useLocalStorage<string[]>(storageKey, []);

  const orderedWorlds = useMemo(() => {
    if (!worlds) return [];
    const sanitizedOrder = worldOrder.filter((w) => worlds.includes(w));
    const remaining = worlds.filter((w) => !sanitizedOrder.includes(w));
    return [...sanitizedOrder, ...remaining];
  }, [worldOrder, worlds]);

  const handleSelect = (selectedWorld: string) => {
    setWorld(selectedWorld);
    setWorldOrder((prev) => [
      selectedWorld,
      ...prev.filter((w) => w !== selectedWorld),
    ]);
  };

  useEffect(() => {
    if (world && worlds?.includes(world)) {
      setWorldOrder((prev) => [world, ...prev.filter((w) => w !== world)]);
    }
  }, [world, worlds, setWorldOrder]);

  return (
    <FilterPopover
      options={
        orderedWorlds?.map((w) => ({
          value: w,
          label: w.charAt(0).toUpperCase() + w.slice(1),
        })) ?? []
      }
      value={world || undefined}
      onValueChange={handleSelect}
      placeholder="Wybierz świat"
      emptyMessage="Brak światów"
      searchPlaceholder="Szukaj świata..."
      width={cn("w-[140px] md:w-[180px]", className)}
      triggerClassName="h-9 shrink-0"
      contentClassName="max-h-64"
      showSearch
    />
  );
};
