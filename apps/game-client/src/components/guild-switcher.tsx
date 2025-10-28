import { cn } from "@/lib/utils";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useGlobalStore } from "@/store/global.store";
import { useSettingsStore } from "@/store/settings.store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type FC, useRef } from "react";
import { useDeepCompareEffect } from "react-use";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Viewport } from "@radix-ui/react-scroll-area";

export type GuildSwitcherProps = {
  disabled?: boolean;
  className?: string;
  onChange?: (guildId: string) => void;
  value?: string;
};

export const GuildSwitcher: FC<GuildSwitcherProps> = ({
  disabled = false,
  className = "",
  onChange,
  value,
}) => {
  const scrollContainerRef = useRef<React.ElementRef<typeof Viewport>>(null);
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
    if (disabled) return;

    if (onChange) {
      onChange(newGuildId);
      return;
    }

    setGuildId(characterId!, newGuildId);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    e.preventDefault();
    scrollContainerRef.current.scrollLeft += e.deltaY;
  };

  const getGuildInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <TooltipProvider>
      <ScrollArea
        className={cn("ll:w-full", className)}
        ref={scrollContainerRef}
        type="hover"
        onWheel={handleWheel}
      >
        <div className="ll:flex ll:gap-1 ll:mt-1">
          {guilds?.map((guild) => {
            const isSelected = guild.id === selectedValue;

            return (
              <Tooltip key={guild.id}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    onClick={() => handleChange(guild.id)}
                    disabled={disabled}
                    className={cn(
                      "ll:flex ll:items-center ll:justify-center ll:transition-all ll:border ll:rounded-sm",
                      "hover:ll:scale-105",
                      "disabled:ll:opacity-50 disabled:ll:cursor-not-allowed",
                      "ll:size-8 ll:p-0 ll:shrink-0",
                      "ll:border-gray-600 ll:bg-gray-800/50 hover:ll:border-muted/20",
                      !disabled && "ll-custom-cursor-pointer",
                      {
                        "ll:border-primary ll:bg-blue-600/20 ll:shadow-primary/50":
                          isSelected,
                      },
                    )}
                  >
                    <Avatar className="ll:size-full ll:flex ll:items-center ll:justify-center">
                      <AvatarImage
                        src={guild.icon ?? undefined}
                        alt={guild.name}
                        className="ll:object-cover ll:size-full ll:rounded-sm"
                      />
                      <AvatarFallback className="ll:text-xs ll:font-semibold">
                        {getGuildInitial(guild.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="ll:z-500">
                  <p className="ll:text-xs ll:font-semibold">{guild.name}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <ScrollBar
          orientation="horizontal"
          className="ll:my-0 ll:mx-0 ll:w-full"
        />
      </ScrollArea>
    </TooltipProvider>
  );
};
