import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import { useSettingsStore } from "@/store/settings.store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type FC, useEffect, useRef } from "react";
import { NativeScrollArea } from "@/components/ui/native-scroll-area";
import { formatChatUnreadBadge } from "@/features/chat/chat-unread.helpers";
import { GuildButton } from "@/components/guild-button";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@/lib/api/generated/main/users/users";
import { useTranslation } from "react-i18next";
import { orderLootlogGuilds } from "@/lib/selected-lootlog-guild";
import { useCurrentCharacterId } from "@/hooks/use-selected-lootlog-guild";
import { useShallow } from "zustand/react/shallow";

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
  unreadCountByGuildId?: Record<string, number>;
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
  unreadCountByGuildId,
  value,
}) => {
  const { t } = useTranslation("common");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const characterId = useCurrentCharacterId();
  const { data: guilds, isFetched } =
    useUsersControllerGetCurrentUserAccessibleGuilds({
      query: {
        queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
        refetchOnMount: false,
        staleTime: 1000 * 60 * 5,
      },
    });
  const { data: userPreferences } = useUserPreferences();
  const { setGuildId, guildId } = useSettingsStore(
    useShallow((state) => ({
      setGuildId: state.setGuildId,
      guildId: characterId ? state.guildIdByCharId[characterId] : undefined,
    })),
  );
  const guildsOrder = userPreferences?.guildsOrder;
  const orderedGuilds = orderLootlogGuilds(guilds ?? [], guildsOrder);
  useEffect(() => {
    if (!isFetched || orderedGuilds.length === 0) return;
    if (multiple) return;
    if (!onChange) return;
    const currentValue = value;
    if (allowAll && currentValue === "all") return;
    const exists = orderedGuilds.some((guild) => guild.id === currentValue);
    if (exists) return;
    onChange(orderedGuilds[0].id);
  }, [isFetched, orderedGuilds, value, allowAll, multiple, onChange]);

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

    if (characterId) {
      setGuildId(characterId, newGuildId);
    }
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
          tooltipLabel={t("guildSwitcher.allServers")}
          className={resolvedButtonClassName}
          unreadBadge={null}
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
          unreadBadge={formatChatUnreadBadge(unreadCountByGuildId?.[guild.id])}
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
      <NativeScrollArea
        className={cn("ll:w-full", className)}
        orientation="horizontal"
        ref={scrollContainerRef}
      >
        <div className="ll:mt-1 ll:flex ll:w-max ll:min-w-full ll:gap-1">
          {content}
        </div>
      </NativeScrollArea>
    </TooltipProvider>
  );
};
