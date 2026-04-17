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
  gridClassName?: string;
  buttonClassName?: string;
  layout?: "scroll" | "grid";
  multiple?: boolean;
  onChange?: (guildId: string) => void;
  onToggle?: (guildId: string) => void;
  selectedValues?: string[];
  value?: string;
};

export const GuildSwitcher: FC<GuildSwitcherProps> = ({
  disabled = false,
  allowAll = false,
  className = "",
  gridClassName = "",
  buttonClassName = "",
  layout = "scroll",
  multiple = false,
  onChange,
  onToggle,
  selectedValues,
  value,
}) => {
  const scrollContainerRef = useRef<React.ElementRef<typeof Viewport>>(null);
  const characterId = String(Game.hero.id);
  const { data: guilds, isFetched } = useGuilds();
  const { setGuildId, guildIdByCharId } = useSettingsStore();

  const guildId = guildIdByCharId[characterId];

  useEffect(() => {
    if (!isFetched || !guilds || guilds.length === 0) return;
    if (multiple) return;
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
  const selectedGuildIds = selectedValues ?? [];
  const resolvedButtonClassName = buttonClassName;

  const handleChange = (newGuildId: string) => {
    if (disabled) return;

    if (multiple) {
      onToggle?.(newGuildId);
      return;
    }

    if (onChange) {
      onChange(newGuildId);
      return;
    }

    setGuildId(characterId, newGuildId);
  };

  useEffect(() => {
    if (layout !== "scroll") return;

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

  const content = (
    <>
      {allowAll && !multiple && (
        <GuildButton
          key="all"
          isSelected={"all" === selectedValue}
          disabled={disabled}
          onClick={() => handleChange("all")}
          tooltipLabel="Wszystkie serwery"
          className={resolvedButtonClassName}
        >
          <AvatarFallback className="ll:font-semibold ll:text-xl ll:mt-1.5">
            *
          </AvatarFallback>
        </GuildButton>
      )}
      {guilds?.map((guild) => (
        <GuildButton
          key={guild.id}
          isSelected={
            multiple
              ? selectedGuildIds.includes(guild.id)
              : guild.id === selectedValue
          }
          disabled={disabled}
          onClick={() => handleChange(guild.id)}
          tooltipLabel={guild.name}
          className={resolvedButtonClassName}
        >
          <AvatarImage
            src={guild.icon ?? undefined}
            alt={guild.name}
            className="ll:object-cover ll:size-full ll:rounded-sm"
          />
          <AvatarFallback className="ll:flex ll:h-full ll:w-full ll:items-center ll:justify-center ll:text-xs ll:font-semibold ll:leading-none">
            {guild.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </GuildButton>
      ))}
    </>
  );

  if (layout === "grid") {
    return (
      <TooltipProvider>
        <div
          className={cn(
            "ll:mt-1 ll:grid ll:grid-cols-4 ll:gap-1",
            className,
            gridClassName,
          )}
        >
          {content}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <ScrollArea
        className={cn("ll:w-full", className)}
        ref={scrollContainerRef}
        type="hover"
      >
        <div className="ll:flex ll:gap-1 ll:mt-1 ll:overflow-hidden">
          {content}
        </div>
        <ScrollBar
          orientation="horizontal"
          className="ll:my-0 ll:mx-0 ll:w-full"
        />
      </ScrollArea>
    </TooltipProvider>
  );
};
