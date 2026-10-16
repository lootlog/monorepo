import { upperFirst } from "es-toolkit";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "usehooks-ts";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { cn } from "cn";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getGuildsControllerGetWorldsByGuildIdQueryKey,
  useGuildsControllerGetWorldsByGuildId,
} from "@lootlog/client/main";
import { ThemeSurfaceOverlay } from "@/themes";

const ALL_WORLDS_SENTINEL = "__ALL__";

type WorldSwitcherProps = {
  className?: string;
  /** The selected world; `null` is all worlds. */
  value: string | null;
  onValueChange: (world: string | null) => void;
  showAllOption?: boolean;
  width?: string;
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "ghost";
  iconClassName?: string;
  align?: "start" | "center" | "end";
  triggerClassName?: string;
  contentClassName?: string;
  worlds?: string[];
};

export const WorldSwitcher: React.FC<WorldSwitcherProps> = ({
  className,
  value,
  onValueChange,
  showAllOption = false,
  width,
  size,
  variant,
  iconClassName,
  align,
  triggerClassName,
  contentClassName,
  worlds: externalWorlds,
}) => {
  const { t } = useTranslation();
  const guildId = useGuildId();

  const { data: fetchedWorlds } = useGuildsControllerGetWorldsByGuildId(
    {
      guildId: guildId ?? "",
    },
    {
      query: {
        enabled: Boolean(guildId) && externalWorlds === undefined,
        queryKey: getGuildsControllerGetWorldsByGuildIdQueryKey({
          guildId: guildId ?? "",
        }),
      },
    },
  );

  const worlds = externalWorlds ?? fetchedWorlds;
  const storageKey = `lootlog:guild:${guildId ?? "global"}:world-order`;
  const [worldOrder, setWorldOrder] = useLocalStorage<string[]>(storageKey, []);

  const availableWorlds = new Set(worlds);
  const orderedWorldNames = new Set(worldOrder);

  const orderedWorlds = worlds
    ? [
        ...worldOrder.filter((world) => availableWorlds.has(world)),
        ...worlds.filter((world) => !orderedWorldNames.has(world)),
      ]
    : [];

  const worldOptions = orderedWorlds.map((world) => ({
    value: world,
    label: upperFirst(world),
  }));

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

    onValueChange(actualWorld);

    if (actualWorld) {
      setWorldOrder((prev) => [
        actualWorld,
        ...prev.filter((w) => w !== actualWorld),
      ]);
    }
  };

  const displayValue =
    value ?? (showAllOption ? ALL_WORLDS_SENTINEL : undefined);

  return (
    <div className="relative">
      <ThemeSurfaceOverlay subtle />
      <FilterPopover
        icon={Globe}
        options={options}
        value={displayValue}
        onValueChange={handleSelect}
        placeholder={t("kills.home.filters.world")}
        emptyMessage={t("common.noResults")}
        searchPlaceholder={t("common.search")}
        width={cn(width ?? "w-[140px] md:w-[200px]", className)}
        size={size}
        variant={variant}
        iconClassName={iconClassName}
        align={align}
        triggerClassName={cn(
          "shrink-0 hover:border-foreground/20 hover:bg-foreground/[0.04] hover:text-foreground",
          triggerClassName,
        )}
        contentClassName={cn("max-h-64", contentClassName)}
        showSearch
        active={showAllOption && value !== null}
      />
    </div>
  );
};
