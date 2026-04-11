import { cn } from "@/lib/utils";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useSettingsStore } from "@/store/settings.store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type FC, useEffect, useRef } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Viewport } from "@radix-ui/react-scroll-area";
import { Game } from "@/lib/game";
import { GuildButton } from "@/components/guild-button";

type GuildSwitcherProps = {
  disabled?: boolean;
  allowAll?: boolean;
  className?: string;
  onChange?: (guildId: string) => void;
  value?: string;
};

export const GuildSwitcher: FC<GuildSwitcherProps> = ({
  disabled = false,
  allowAll = false,
  className = "",
  onChange,
  value,
}) => {
  const scrollContainerRef = useRef<React.ElementRef<typeof Viewport>>(null);
  const characterId = String(Game.hero.id);
  const { data: guilds, isFetched } = useGuilds();
  const { setGuildId, guildIdByCharId } = useSettingsStore();

  const guildId = guildIdByCharId[characterId];

  useEffect(() => {
    if (!isFetched || !guilds || guilds.length === 0) return;
    const currentValue = value !== undefined ? value : guildId;
    if (allowAll && currentValue === "all") return;
    const exists = guilds.some((guild) => guild.id === currentValue);
    if (exists) return;
    if (onChange) {
      onChange(guilds[0].id);
    } else {
      setGuildId(characterId, guilds[0].id);
    }
  }, [
    isFetched,
    guilds,
    guildId,
    value,
    allowAll,
    onChange,
    characterId,
    setGuildId,
  ]);

  const selectedValue = value !== undefined ? value : guildId;

  const handleChange = (newGuildId: string) => {
    if (disabled) return;

    if (onChange) {
      onChange(newGuildId);
      return;
    }

    setGuildId(characterId, newGuildId);
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollContainer.scrollLeft += e.deltaY;
    };

    scrollContainer.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      scrollContainer.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <TooltipProvider>
      <ScrollArea
        className={cn("ll:w-full", className)}
        ref={scrollContainerRef}
        type="hover"
      >
        <div className="ll:flex ll:gap-1 ll:mt-1 ll:overflow-hidden">
          {allowAll && (
            <GuildButton
              key="all"
              isSelected={"all" === selectedValue}
              disabled={disabled}
              onClick={() => handleChange("all")}
              tooltipLabel="Wszystkie serwery"
            >
              <AvatarFallback className="ll:font-semibold ll:text-xl ll:mt-1.5">
                *
              </AvatarFallback>
            </GuildButton>
          )}
          {guilds?.map((guild) => (
            <GuildButton
              key={guild.id}
              isSelected={guild.id === selectedValue}
              disabled={disabled}
              onClick={() => handleChange(guild.id)}
              tooltipLabel={guild.name}
            >
              <AvatarImage
                src={guild.icon ?? undefined}
                alt={guild.name}
                className="ll:object-cover ll:size-full ll:rounded-sm"
              />
              <AvatarFallback className="ll:text-xs ll:font-semibold">
                {guild.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </GuildButton>
          ))}
        </div>
        <ScrollBar
          orientation="horizontal"
          className="ll:my-0 ll:mx-0 ll:w-full"
        />
      </ScrollArea>
    </TooltipProvider>
  );
};
