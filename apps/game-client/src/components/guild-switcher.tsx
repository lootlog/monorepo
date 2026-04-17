import { cn } from "@/lib/utils";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import { useSettingsStore } from "@/store/settings.store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type FC, useEffect, useRef } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Game } from "@/lib/game";
import { GuildButton } from "@/components/guild-button";
import type { Guild } from "@/api";

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

const orderGuilds = (guilds: Guild[] | undefined, guildsOrder?: string[]) => {
  if (!guilds?.length) {
    return [];
  }

  if (!guildsOrder?.length) {
    return guilds;
  }

  const guildsById = new Map(guilds.map((guild) => [guild.id, guild] as const));
  const orderedGuilds = guildsOrder
    .map((guildId) => guildsById.get(guildId))
    .filter((guild): guild is Guild => guild !== undefined);
  const orderedGuildIds = new Set(orderedGuilds.map((guild) => guild.id));
  const remainingGuilds = guilds.filter(
    (guild) => !orderedGuildIds.has(guild.id),
  );

  return [...orderedGuilds, ...remainingGuilds];
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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const characterId = String(Game.hero.id);
  const { data: guilds, isFetched } = useGuilds();
  const { data: userPreferences } = useUserPreferences();
  const { setGuildId, guildIdByCharId } = useSettingsStore();
  const guildsOrder = userPreferences?.guildsOrder;
  const orderedGuilds = orderGuilds(guilds, guildsOrder);

  const guildId = guildIdByCharId[characterId];

  useEffect(() => {
    if (!isFetched || orderedGuilds.length === 0) return;
    if (multiple) return;
    const currentValue = value !== undefined ? value : guildId;
    if (allowAll && currentValue === "all") return;
    const exists = orderedGuilds.some((guild) => guild.id === currentValue);
    if (exists) return;
    if (onChange) {
      onChange(orderedGuilds[0].id);
    } else {
      setGuildId(characterId, orderedGuilds[0].id);
    }
  }, [
    isFetched,
    orderedGuilds,
    guildId,
    value,
    allowAll,
    multiple,
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
    if (layout !== "scroll") {
      return;
    }

    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) {
        return;
      }

      event.preventDefault();
      scrollContainer.scrollLeft += event.deltaY;
    };

    scrollContainer.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      scrollContainer.removeEventListener("wheel", handleWheel);
    };
  }, [layout]);

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
      {orderedGuilds.map((guild) => (
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
        <div className="ll:mt-1 ll:flex ll:w-max ll:min-w-full ll:gap-1">
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
