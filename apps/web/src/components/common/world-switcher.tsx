import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "usehooks-ts";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { cn } from "@lootlog/ui/lib/utils";
import { GuildContext } from "@/contexts/guild.context";
import { useWorlds } from "@/hooks/api/game-data/use-worlds";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { ThemeSurfaceOverlay } from "@/themes";

const ALL_WORLDS_SENTINEL = "__ALL__";

type WorldSwitcherProps = {
  className?: string;
  value?: string | null;
  onValueChange?: (world: string | null) => void;
  showAllOption?: boolean;
  width?: string;
  triggerClassName?: string;
  worlds?: string[];
};

export const WorldSwitcher: React.FC<WorldSwitcherProps> = ({
  className,
  value,
  onValueChange,
  showAllOption = false,
  width,
  triggerClassName,
  worlds: externalWorlds,
}) => {
  const { t } = useTranslation();
  const { data: fetchedWorlds } = useWorlds();
  const worlds = externalWorlds ?? fetchedWorlds;
  const guildContext = useContext(GuildContext);
  const contextWorld = guildContext?.world ?? "";
  const setContextWorld = guildContext?.setWorld;
  const guildId = useGuildId();
  const storageKey = `lootlog:guild:${guildId ?? "global"}:world-order`;
  const [worldOrder, setWorldOrder] = useLocalStorage<string[]>(storageKey, []);

  const isControlled = value !== undefined;
  const currentWorld = isControlled ? value : contextWorld;

  const orderedWorlds = (() => {
    if (!worlds) return [];
    const sanitizedOrder = worldOrder.filter((w) => worlds.includes(w));
    const remaining = worlds.filter((w) => !sanitizedOrder.includes(w));
    return [...sanitizedOrder, ...remaining];
  })();

  const worldOptions =
    orderedWorlds?.map((w) => ({
      value: w,
      label: w.charAt(0).toUpperCase() + w.slice(1),
    })) ?? [];

  const options = showAllOption
    ? [
        {
          value: ALL_WORLDS_SENTINEL,
          label: t("kills.home.filters.allWorlds"),
        },
        ...worldOptions,
      ]
    : worldOptions;

  const handleSelect = (selectedValue: string) => {
    const actualWorld =
      selectedValue === ALL_WORLDS_SENTINEL ? null : selectedValue;

    if (isControlled) {
      onValueChange?.(actualWorld);
    } else {
      setContextWorld?.(actualWorld ?? "");
    }

    if (actualWorld) {
      setWorldOrder((prev) => [
        actualWorld,
        ...prev.filter((w) => w !== actualWorld),
      ]);
    }
  };

  const displayValue =
    currentWorld ?? (showAllOption ? ALL_WORLDS_SENTINEL : undefined);

  return (
    <div className="relative">
      <ThemeSurfaceOverlay subtle rounded="rounded-md" />
      <FilterPopover
        options={options}
        value={displayValue}
        onValueChange={handleSelect}
        placeholder={t("kills.home.filters.world")}
        emptyMessage={t("common.noResults")}
        searchPlaceholder={t("common.search")}
        width={cn(width ?? "w-[140px] md:w-[180px]", className)}
        triggerClassName={cn("h-9 shrink-0", triggerClassName)}
        contentClassName="max-h-64"
        showSearch
      />
    </div>
  );
};
