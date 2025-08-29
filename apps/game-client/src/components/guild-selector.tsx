import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGuilds } from "@/hooks/api/use-guilds";
import { cn } from "@/lib/utils";
import { useGlobalStore } from "@/store/global.store";
import { useSettingsStore } from "@/store/settings.store";
import { FC } from "react";
import { useDeepCompareEffect } from "react-use";

export type GuildSelectorProps = {
  disabled?: boolean;
  className?: string;
  onChange?: (guildId: string) => void;
  value?: string;
};

export const GuildSelector: FC<GuildSelectorProps> = ({
  disabled = false,
  className = "",
  onChange,
  value,
}) => {
  const { characterId } = useGlobalStore((state) => state.gameState);
  const { data: guilds, isFetched } = useGuilds();
  const { setGuildId, guildIdByCharId } = useSettingsStore();

  const guildId = guildIdByCharId[characterId!];

  useDeepCompareEffect(() => {
    if (!isFetched || !guilds || guilds.length === 0 || value) return;
    const exists = guilds.some((guild) => guild.id === guildId);
    if (!exists) {
      setGuildId(characterId!, guilds[0].id);
    }
  }, [guilds, isFetched, guildId]);

  const selectedValue = value !== undefined ? value : guildId;

  const handleChange = (newGuildId: string) => {
    if (onChange) {
      onChange(newGuildId);
      return;
    }

    setGuildId(characterId!, newGuildId);
  };

  return (
    <Select
      value={selectedValue}
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "ll-w-[231px] ll-text-white ll-text-xs ll-border-gray-400 ll-rounded-xs ll-h-4 ll-mb-1 ll-custom-cursor-pointer",
          className
        )}
      >
        <SelectValue
          placeholder="Wybierz serwer..."
          className="ll-h-4 ll-text-sm ll-text-white"
        />
      </SelectTrigger>
      <SelectContent className="ll-font-sans ll-z-[500] ll-w-[232px] ll-py-1">
        {guilds?.map((guild) => {
          return (
            <SelectItem
              key={guild.id}
              value={guild.id}
              className="ll-text-xs ll-font-semibold ll-w-full ll-h-5"
            >
              {guild.name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
