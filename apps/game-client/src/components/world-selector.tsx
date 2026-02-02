import { Combobox, type ComboboxGroup } from "@/components/ui/combobox";
import { useWorlds } from "@/hooks/api/use-worlds";
import { Game } from "@/lib/game";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settings.store";
import { type FC, useEffect, useMemo } from "react";
import { useLocalStorage } from "react-use";

export type WorldSelectorProps = {
  disabled?: boolean;
  className?: string;
};

const MAX_RECENT_WORLDS = 3;

export const WorldSelector: FC<WorldSelectorProps> = ({
  disabled = false,
  className = "",
}) => {
  const characterId = String(Game.hero.id);
  const accountId = String(Game.hero.account);
  const defaultWorld = Game.getWorldName();

  const { guildIdByCharId, worldByGuildId, setWorld } = useSettingsStore();
  const guildId = guildIdByCharId[characterId];
  const world = guildId ? worldByGuildId[guildId] : undefined;
  const { data: worlds, isFetched } = useWorlds({ guildId });

  const [recentWorlds, setRecentWorlds] = useLocalStorage<string[]>(
    `ll:recent-worlds:${accountId}:${characterId}`,
    [],
  );

  useEffect(() => {
    if (!isFetched || !guildId || !worlds) return;
    if (!world) {
      if (defaultWorld && worlds.includes(defaultWorld)) {
        setWorld(guildId, defaultWorld);
      } else if (worlds.length > 0) {
        setWorld(guildId, worlds[0]);
      }
      return;
    }

    if (!worlds.includes(world)) {
      if (defaultWorld && worlds.includes(defaultWorld)) {
        setWorld(guildId, defaultWorld);
      } else if (worlds.length > 0) {
        setWorld(guildId, worlds[0]);
      }
    }
  }, [guildId, isFetched, worlds, world, defaultWorld, setWorld]);

  const worldGroups = useMemo<ComboboxGroup[]>(() => {
    if (!worlds || worlds.length === 0) return [];

    const recent =
      recentWorlds
        ?.filter((w) => worlds.includes(w))
        .map((w) => ({
          value: w,
          label: w.charAt(0).toUpperCase() + w.slice(1),
        })) ?? [];

    const recentValues = new Set(recent.map((w) => w.value));
    const rest = worlds
      .filter((w) => !recentValues.has(w))
      .map((w) => ({
        value: w,
        label: w.charAt(0).toUpperCase() + w.slice(1),
      }));

    const groups: ComboboxGroup[] = [];

    if (recent.length > 0) {
      groups.push({ label: "Ostatnio używane", options: recent });
    }

    if (rest.length > 0) {
      groups.push({ label: "Wszystkie światy", options: rest });
    }

    return groups;
  }, [worlds, recentWorlds]);

  const handleWorldChange = (newWorld: string) => {
    if (!guildId) return;

    if (newWorld) {
      const updatedRecent = [
        newWorld,
        ...(recentWorlds?.filter((w) => w !== newWorld) ?? []),
      ].slice(0, MAX_RECENT_WORLDS);
      setRecentWorlds(updatedRecent);
    }

    setWorld(guildId, newWorld);
  };

  return (
    <Combobox
      value={world}
      onValueChange={handleWorldChange}
      groups={worldGroups}
      placeholder="Wybierz świat..."
      searchPlaceholder="Szukaj świata..."
      emptyText="Nie znaleziono światów."
      disabled={disabled}
      triggerClassName={cn(
        "ll:text-white ll:text-xs ll:border-gray-400 ll:rounded-xs ll:h-6 ll:mb-1 ll-custom-cursor-pointer ll:w-full",
        className,
      )}
      contentClassName="ll:font-sans ll:z-500"
    />
  );
};
