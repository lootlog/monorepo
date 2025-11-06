import { Combobox, type ComboboxGroup } from "@/components/ui/combobox";
import { useGuilds } from "@/hooks/api/use-guilds";
import { Game } from "@/lib/game";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settings.store";
import { type FC, useMemo } from "react";
import { useDeepCompareEffect, useLocalStorage } from "react-use";

export type GuildSelectorProps = {
  disabled?: boolean;
  className?: string;
  onChange?: (guildId: string) => void;
  value?: string;
};

const MAX_RECENT_GUILDS = 5;

export const GuildSelector: FC<GuildSelectorProps> = ({
  disabled = false,
  className = "",
  onChange,
  value,
}) => {
  const characterId = String(Game.hero.id);
  const accountId = String(Game.hero.account);
  const { data: guilds, isFetched } = useGuilds();
  const { setGuildId, guildIdByCharId } = useSettingsStore();

  const [recentGuildIds, setRecentGuildIds] = useLocalStorage<string[]>(
    `ll:recent-guilds:${accountId}:${characterId}`,
    [],
  );

  const guildId = guildIdByCharId[characterId];

  useDeepCompareEffect(() => {
    if (!isFetched || !guilds || guilds.length === 0 || value) return;
    const exists = guilds.some((guild) => guild.id === guildId);
    if (!exists) {
      setGuildId(characterId, guilds[0].id);
    }
  }, [guilds, isFetched, guildId]);

  const selectedValue = value !== undefined ? value : guildId;

  const guildGroups = useMemo<ComboboxGroup[]>(() => {
    if (!guilds || guilds.length === 0) return [];

    const recent =
      recentGuildIds
        ?.filter((id) => guilds.some((guild) => guild.id === id))
        .map((id) => {
          const guild = guilds.find((g) => g.id === id);
          if (!guild) return null;
          return { value: guild.id, label: guild.name };
        })
        .filter((g): g is { value: string; label: string } => g !== null) ?? [];

    const recentIds = new Set(recent.map((g) => g.value));
    const rest = guilds
      .filter((guild) => !recentIds.has(guild.id))
      .map((guild) => ({ value: guild.id, label: guild.name }));

    const groups: ComboboxGroup[] = [];

    if (recent.length > 0) {
      groups.push({ label: "Ostatnio używane", options: recent });
    }

    if (rest.length > 0) {
      groups.push({ label: "Wszystkie serwery", options: rest });
    }

    return groups;
  }, [guilds, recentGuildIds]);

  const handleChange = (newGuildId: string) => {
    if (newGuildId) {
      const updatedRecent = [
        newGuildId,
        ...(recentGuildIds?.filter((id) => id !== newGuildId) ?? []),
      ].slice(0, MAX_RECENT_GUILDS);
      setRecentGuildIds(updatedRecent);
    }

    if (onChange) {
      onChange(newGuildId);
      return;
    }

    setGuildId(characterId, newGuildId);
  };

  return (
    <Combobox
      value={selectedValue}
      onValueChange={handleChange}
      groups={guildGroups}
      placeholder="Wybierz serwer..."
      searchPlaceholder="Szukaj serwera..."
      emptyText="Nie znaleziono serwerów."
      disabled={disabled}
      triggerClassName={cn(
        "ll:w-[231px] ll:text-white ll:text-xs ll:border-gray-400 ll:rounded-xs ll:h-6 ll:mb-1 ll-custom-cursor-pointer",
        className,
      )}
      contentClassName="ll:font-sans ll:z-500 ll:max-h-[300px]"
    />
  );
};
