import { ChevronDown } from "lucide-react";
import { useState, type ComponentProps, type FC } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { ChecklistMenu } from "@/components/checklist-menu";
import { GuildsLoadStatus } from "@/components/guilds-load-status";
import { GuildAvatar } from "@/components/guild-avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { selectTriggerClassName } from "@/components/ui/select";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { toggleAvailableGuild } from "@/lib/selected-lootlog-guild";

type GuildTargetPickerProps = {
  /** Resolved targets (see `useGuildTargets`), never empty once guilds load. */
  value: readonly string[];
  onChange: (guildIds: string[]) => void;
  disabled?: boolean;
  className?: string;
  /** Where focus goes when the list closes; the trigger by default. */
  finalFocus?: ComponentProps<typeof PopoverContent>["finalFocus"];
};

const MAX_TRIGGER_AVATARS = 3;

/**
 * Compact "send to" field for composers that post to several Lootlogs at
 * once: the trigger names the first target and counts the rest, and the list
 * toggles targets. The last target cannot be switched off, so the composer
 * always has somewhere to send.
 */
export const GuildTargetPicker: FC<GuildTargetPickerProps> = ({
  value,
  onChange,
  disabled = false,
  className,
  finalFocus,
}) => {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  const {
    areVisibleGuildsResolved,
    guildsQuery: { data: guilds },
    visibleGuilds,
  } = useLootlogGuilds();

  if (!areVisibleGuildsResolved || !guilds) {
    return <GuildsLoadStatus className={className} />;
  }

  const selected = new Set(value);
  const targets = visibleGuilds.filter((guild) => selected.has(guild.id));
  const [firstTarget] = targets;

  if (!firstTarget) {
    return guilds.length > 0 ? (
      <span
        className={cn(
          "ll:px-1.5 ll:text-xs ll:text-muted-foreground",
          className,
        )}
      >
        {t("guildSwitcher.allHidden")}
      </span>
    ) : null;
  }

  const toggle = (guildId: string) => {
    const next = toggleAvailableGuild(visibleGuilds, value, guildId);

    if (next.length > 0) onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-size="sm"
          disabled={disabled}
          aria-label={t("guildTargets.triggerLabel", {
            names: targets.map((guild) => guild.name).join(", "),
          })}
          className={cn(selectTriggerClassName, "ll:w-auto", className)}
        >
          <span>
            <span className="ll:flex ll:shrink-0 ll:-space-x-1">
              {targets.slice(0, MAX_TRIGGER_AVATARS).map((guild) => (
                <GuildAvatar
                  key={guild.id}
                  guild={guild}
                  className="ll:ring-1 ll:ring-black"
                />
              ))}
            </span>
            <span className="ll:truncate">{firstTarget.name}</span>
            {targets.length > 1 ? (
              <span className="ll:shrink-0 ll:text-muted-foreground ll:tabular-nums">
                +{targets.length - 1}
              </span>
            ) : null}
          </span>
          <ChevronDown aria-hidden className="ll:size-3.5 ll:opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        finalFocus={finalFocus}
        className="ll-action-menu ll:w-56 ll:overflow-hidden ll:p-0"
      >
        <ChecklistMenu
          aria-label={t("guildTargets.label")}
          className="ll:max-h-60 ll:overflow-y-auto"
          items={visibleGuilds.map((guild) => ({
            value: guild.id,
            label: guild.name,
            leading: <GuildAvatar guild={guild} />,
          }))}
          selected={selected}
          onToggle={toggle}
        />
      </PopoverContent>
    </Popover>
  );
};
