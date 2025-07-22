import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGuilds } from "@/hooks/api/use-guilds";
import { cn } from "@/lib/utils";
import { FC } from "react";
import { useDeepCompareEffect } from "react-use";

export type GuildSelectorProps = {
  selectedGuildId?: string;
  setSelectedGuildId: (guildId: string) => void;
  disabled?: boolean;
  className?: string;
};

export const GuildSelector: FC<GuildSelectorProps> = ({
  selectedGuildId,
  setSelectedGuildId,
  disabled = false,
  className = "",
}) => {
  const { data: guilds, isFetched } = useGuilds();

  useDeepCompareEffect(() => {
    if (!isFetched || !guilds || guilds.length === 0) return;
    const exists = guilds.some((guild) => guild.id === selectedGuildId);
    if (!exists) {
      setSelectedGuildId(guilds[0].id);
    }
  }, [guilds, isFetched, selectedGuildId]);

  return (
    <Select
      value={selectedGuildId}
      onValueChange={setSelectedGuildId}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "w-[180px] ll-text-white ll-text-xs ll-border-gray-400 ll-rounded-xs ll-h-4 ll-mb-1 ll-custom-cursor-pointer",
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
              className="ll-text-xs ll-font-semibold ll-w-[222px] ll-h-5"
            >
              {guild.name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
