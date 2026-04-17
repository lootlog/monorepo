import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Guild } from "@/hooks/api/use-guilds";
import { cn } from "@/lib/utils";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type SettingsGuildSelectionGridSharedProps = {
  className?: string;
  disabled?: boolean;
  emptyStateLabel: string;
  guilds?: Guild[];
  variant?: "compact" | "default";
};

type SettingsGuildSelectionGridMultipleProps =
  SettingsGuildSelectionGridSharedProps & {
    selectionMode?: "multiple";
    onToggle: (guildId: string) => void;
    selectedGuildIds: string[];
    onSelect?: never;
    selectedGuildId?: never;
  };

type SettingsGuildSelectionGridSingleProps =
  SettingsGuildSelectionGridSharedProps & {
    selectionMode: "single";
    onSelect: (guildId: string) => void;
    selectedGuildId?: string;
    onToggle?: never;
    selectedGuildIds?: never;
  };

type SettingsGuildSelectionGridProps =
  | SettingsGuildSelectionGridMultipleProps
  | SettingsGuildSelectionGridSingleProps;

export const SettingsGuildSelectionGrid: FC<
  SettingsGuildSelectionGridProps
> = ({
  className,
  disabled = false,
  emptyStateLabel,
  guilds,
  selectionMode = "multiple",
  variant = "default",
  ...selectionProps
}) => {
  const { t } = useTranslation();
  if (!guilds || guilds.length === 0) {
    return <SettingsEmptyState>{emptyStateLabel}</SettingsEmptyState>;
  }

  const selectedGuildIds: string[] =
    selectionMode === "single"
      ? selectionProps.selectedGuildId
        ? [selectionProps.selectedGuildId]
        : []
      : (selectionProps.selectedGuildIds ?? []);

  const handleSelect = (guildId: string) => {
    if (selectionMode === "single") {
      const { onSelect, selectedGuildId } =
        selectionProps as SettingsGuildSelectionGridSingleProps;

      if (selectedGuildId === guildId) {
        return;
      }

      onSelect(guildId);
      return;
    }

    const { onToggle } =
      selectionProps as SettingsGuildSelectionGridMultipleProps;
    onToggle(guildId);
  };

  return (
    <div
      className={cn(
        variant === "compact"
          ? "ll:grid ll:grid-cols-[repeat(auto-fit,minmax(2.75rem,2.75rem))] ll:justify-start ll:gap-2"
          : "ll:grid ll:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] ll:gap-2.5",
        className,
      )}
    >
      {guilds.map((guild) => {
        const isSelected = selectedGuildIds.includes(guild.id);
        const stateLabel = isSelected
          ? t("settings.common.guildSelection.enabled")
          : t("settings.common.guildSelection.disabled");
        const button = (
          <button
            key={guild.id}
            type="button"
            onClick={() => handleSelect(guild.id)}
            disabled={disabled}
            aria-pressed={isSelected}
            aria-label={
              selectionMode === "single"
                ? t("settings.common.guildSelection.selectAria", {
                    name: guild.name,
                    state: stateLabel,
                  })
                : t("settings.common.guildSelection.toggleAria", {
                    name: guild.name,
                    state: stateLabel,
                  })
            }
            className={cn(
              "ll:group ll:relative ll:overflow-hidden ll:border ll:transition-[transform,border-color,background-color,box-shadow,opacity] ll:duration-200",
              "ll:disabled:cursor-not-allowed ll:disabled:opacity-50",
              "ll-custom-cursor-pointer",
              variant === "compact"
                ? "ll:flex ll:size-11 ll:items-center ll:justify-center ll:rounded-md ll:border-gray-700/90 ll:bg-gray-900/85 ll:p-0 hover:ll:-translate-y-0.5 hover:ll:border-gray-500/90 hover:ll:bg-gray-800/90"
                : "ll:flex ll:min-h-20 ll:w-full ll:flex-col ll:items-start ll:justify-between ll:gap-2.5 ll:rounded-md ll:border-gray-700/90 ll:bg-gray-900/90 ll:px-2.5 ll:py-2.5 ll:text-left hover:ll:-translate-y-0.5 hover:ll:border-gray-500/90 hover:ll:bg-gray-800/90",
              isSelected &&
                (variant === "compact"
                  ? "ll:border-purple-400/85 ll:bg-purple-500/20 ll:shadow-[0_0_0_1px_rgba(192,132,252,0.28),0_8px_18px_rgba(168,85,247,0.18)]"
                  : "ll:border-purple-400/80 ll:bg-purple-500/20 ll:shadow-[0_0_0_1px_rgba(192,132,252,0.22),0_12px_30px_rgba(168,85,247,0.16)]"),
            )}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >
            <div
              className={cn(
                "ll:pointer-events-none ll:absolute ll:right-0 ll:top-0 ll:rounded-full ll:bg-purple-400/0 ll:blur-2xl ll:transition-opacity",
                variant === "compact"
                  ? "ll:h-10 ll:w-10 ll:-translate-y-2 ll:translate-x-2"
                  : "ll:h-12 ll:w-12 ll:-translate-y-3 ll:translate-x-3",
                isSelected
                  ? "ll:opacity-100"
                  : "ll:opacity-0 group-hover:ll:opacity-70",
              )}
            />

            {variant === "compact" ? (
              <Avatar className="ll:size-8 ll:shrink-0 ll:rounded-md ll:border ll:border-white/10 ll:bg-black/20">
                <AvatarImage
                  src={guild.icon ?? undefined}
                  alt={guild.name}
                  className="ll:h-full ll:w-full ll:object-cover"
                />
                <AvatarFallback className="ll:flex ll:h-full ll:w-full ll:items-center ll:justify-center ll:rounded-md ll:bg-gray-800 ll:text-[10px] ll:font-semibold ll:text-gray-100">
                  {guild.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <>
                <div className="ll:flex ll:w-full ll:items-center ll:justify-between ll:gap-2">
                  <Avatar className="ll:size-10 ll:shrink-0 ll:rounded-md ll:border ll:border-white/10 ll:bg-black/20">
                    <AvatarImage
                      src={guild.icon ?? undefined}
                      alt={guild.name}
                      className="ll:h-full ll:w-full ll:object-cover"
                    />
                    <AvatarFallback className="ll:flex ll:h-full ll:w-full ll:items-center ll:justify-center ll:rounded-md ll:bg-gray-800 ll:text-xs ll:font-semibold ll:text-gray-100">
                      {guild.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <span
                    className={cn(
                      "ll:inline-flex ll:min-h-5 ll:items-center ll:rounded-sm ll:border ll:px-1.5 ll:py-0.5 ll:text-[9px] ll:font-semibold ll:uppercase ll:tracking-[0.08em]",
                      isSelected
                        ? "ll:border-purple-300/80 ll:bg-purple-500/24 ll:text-white"
                        : "ll:border-gray-600/70 ll:bg-black/20 ll:text-gray-400",
                    )}
                  >
                    {stateLabel}
                  </span>
                </div>

                <div className="ll:min-w-0">
                  <div className="ll:truncate ll:text-[13px] ll:font-semibold ll:text-white">
                    {guild.name}
                  </div>
                </div>
              </>
            )}
          </button>
        );

        return variant === "compact" ? (
          <Tooltip key={guild.id}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="bottom" className="ll:z-500">
              <p className="ll:text-xs ll:font-semibold">{guild.name}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          button
        );
      })}
    </div>
  );
};
