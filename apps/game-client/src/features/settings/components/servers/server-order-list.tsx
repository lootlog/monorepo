import { ToggleGroup } from "@/components/ui/toggle-group";
import { SettingsGuildPickerItem } from "@/features/settings/components/shared/settings-guild-picker";
import { useSortableList } from "@/hooks/ui/use-sortable-list";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import { cn } from "cn";
import { GripVertical } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type ServerOrderListProps = {
  guilds: readonly Guild[];
  selectedGuildIds: readonly string[];
  onToggle: (guildId: string) => void;
  onReorder: (guildIds: string[]) => void;
  /** Reordering is off while the list is filtered: a partial order is ambiguous. */
  reorderDisabled?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
};

/**
 * Server cards stacked one under another, each with a drag handle in front.
 * Clicking a card toggles its visibility; dragging the handle (or pressing
 * arrow keys on it) sets the order the servers take in every switcher of the
 * game client.
 */
export const ServerOrderList: FC<ServerOrderListProps> = ({
  guilds,
  selectedGuildIds,
  onToggle,
  onReorder,
  reorderDisabled = false,
  disabled = false,
  "aria-label": ariaLabel,
}) => {
  const { t } = useTranslation();
  const ids = guilds.map((guild) => guild.id);

  const sortable = useSortableList({
    ids,
    onReorder,
    disabled: disabled || reorderDisabled,
  });

  const movedGuild = sortable.lastMove
    ? guilds.find((guild) => guild.id === sortable.lastMove?.id)
    : undefined;

  return (
    <div className="ll:px-2 ll:py-0.5">
      <ToggleGroup
        multiple
        aria-label={ariaLabel}
        disabled={disabled}
        value={selectedGuildIds}
        onValueChange={(nextGuildIds) => {
          const toggledGuildId =
            nextGuildIds.find((id) => !selectedGuildIds.includes(id)) ??
            selectedGuildIds.find((id) => !nextGuildIds.includes(id));

          if (toggledGuildId) onToggle(toggledGuildId);
        }}
        className={cn(
          "ll:flex ll:w-full ll:flex-col ll:items-stretch ll:gap-1.5",
          sortable.draggingId !== null && "ll:select-none",
        )}
      >
        {guilds.map((guild, index) => {
          const isDragging = sortable.draggingId === guild.id;

          return (
            <div
              key={guild.id}
              {...sortable.getRowProps(guild.id)}
              className={cn(
                "ll:relative ll:transition-transform ll:duration-150 ll:ease-[cubic-bezier(0.2,0,0,1)]",
                isDragging && "ll:z-10 ll:transition-none",
              )}
            >
              <button
                type="button"
                {...sortable.getHandleProps(guild.id)}
                aria-label={t("settings.servers.order.handleLabel", {
                  name: guild.name,
                  position: index + 1,
                  count: guilds.length,
                })}
                title={
                  reorderDisabled
                    ? t("settings.servers.order.filteredHint")
                    : t("settings.servers.order.handleHint")
                }
                className={cn(
                  // Sits over the card's left edge: a button cannot nest inside
                  // the card's own button, so it is a sibling drawn inside it.
                  "ll:absolute ll:top-1/2 ll:left-1 ll:z-10 ll:flex ll:size-6 ll:-translate-y-1/2 ll:touch-none ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:text-muted-foreground ll:transition-colors ll:hover:bg-white/10 ll:hover:text-foreground ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:disabled:opacity-40 ll:[&_svg]:size-3.5",
                  isDragging ? "ll:cursor-grabbing" : "ll:cursor-grab",
                )}
              >
                <GripVertical aria-hidden />
              </button>
              <SettingsGuildPickerItem
                guild={guild}
                className={cn(
                  "ll:w-full ll:pl-8",
                  isDragging &&
                    "ll:shadow-[0_4px_16px_rgba(0,0,0,0.45),inset_0_0_0_1px_var(--color-primary)]",
                )}
              />
            </div>
          );
        })}
      </ToggleGroup>
      <div role="status" aria-live="polite" className="ll:sr-only">
        {movedGuild && sortable.lastMove
          ? t("settings.servers.order.moved", {
              name: movedGuild.name,
              position: sortable.lastMove.index + 1,
              count: guilds.length,
            })
          : null}
      </div>
    </div>
  );
};
