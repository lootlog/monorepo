import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsNumberField } from "@/components/settings/settings-number-field";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsTextField } from "@/components/settings/settings-text-field";
import { SettingsGuildPicker } from "@/features/settings/components/shared/settings-guild-picker";
import {
  LEVEL_MAX,
  LEVEL_MIN,
  normalizeRoutingRuleText,
} from "@/features/settings/components/detector/use-detector-routing-form";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import { MapPin, Trash2, TriangleAlert } from "lucide-react";
import { useId, type FC } from "react";
import { useTranslation } from "react-i18next";

type DetectorRoutingRuleProps = {
  /** 1-based position; the fallback name and the badge. */
  index: number;
  guilds: Guild[] | undefined;
  /** Stored rule name; blank when the rule is unnamed. */
  name: string;
  minLevel: number;
  maxLevel: number;
  /** Stored world filter; blank when the rule covers every world. */
  world: string;
  /** World the player is on right now; offered as a one-click fill. */
  currentWorld?: string;
  selectedGuildIds: string[];
  onRemove: () => void;
  onToggleGuild: (guildId: string) => void;
  onLevelRangeCommit: (range: [number, number]) => void;
  onWorldCommit: (world: string) => void;
  onNameCommit: (name: string) => void;
};

/**
 * One delivery rule, always fully visible: a numbered header with the name,
 * the two match conditions side by side, and the Lootlogi grid under them.
 * A rule without a Lootlog warns right above the picker, where it is fixed.
 */
export const DetectorRoutingRule: FC<DetectorRoutingRuleProps> = ({
  index,
  guilds,
  name,
  minLevel,
  maxLevel,
  world,
  currentWorld,
  selectedGuildIds,
  onRemove,
  onToggleGuild,
  onLevelRangeCommit,
  onWorldCommit,
  onNameCommit,
}) => {
  const { t } = useTranslation();
  const worldInputId = useId();

  const label =
    normalizeRoutingRuleText(name) ??
    t("settings.detector.routing.ruleLabel", { index });

  const guildCount = guilds?.length ?? 0;
  const selectedCount = selectedGuildIds.length;
  const sendsNothing = selectedCount === 0;

  const canUseCurrentWorld =
    !!currentWorld &&
    currentWorld !== "unknown" &&
    currentWorld.toLowerCase() !==
      normalizeRoutingRuleText(world)?.toLowerCase();

  // World names are matched case-insensitively; show the game's lowercase
  // value the way the world selector does.
  const currentWorldLabel = currentWorld
    ? currentWorld.charAt(0).toUpperCase() + currentWorld.slice(1)
    : "";

  return (
    <article
      aria-label={label}
      className="ll:flex ll:flex-col ll:overflow-hidden ll:rounded-sm ll:bg-black/25 ll:shadow-[inset_0_0_0_1px_var(--color-border)] ll:transition-shadow ll:duration-200 ll:focus-within:shadow-[inset_0_0_0_1px_var(--color-ring)]"
    >
      <header className="ll:flex ll:min-h-8 ll:items-center ll:gap-2 ll:bg-white/[0.03] ll:ps-2 ll:pe-1 ll:py-1">
        <span
          aria-hidden
          className="ll:flex ll:size-5 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:bg-primary/20 ll:text-xs ll:font-semibold ll:tabular-nums ll:text-primary"
        >
          {index}
        </span>
        <div className="ll:min-w-0 ll:flex-1">
          <SettingsTextField
            variant="borderless"
            aria-label={t("settings.detector.routing.ruleNameLabel")}
            placeholder={t("settings.detector.routing.ruleNamePlaceholder", {
              index,
            })}
            className="ll:w-full ll:px-1 ll:text-[13px] ll:font-semibold ll:focus-visible:shadow-[inset_0_0_0_1px_var(--color-ring)]"
            value={name}
            onCommit={onNameCommit}
          />
        </div>
        <span className="ll:shrink-0 ll:text-xs ll:leading-4 ll:tabular-nums ll:text-muted-foreground">
          {t("settings.detector.routing.selectedCount", {
            selected: selectedCount,
            total: guildCount,
          })}
        </span>
        <SettingsIconButton
          variant="destructive"
          label={t("settings.detector.routing.deleteRuleLabel", {
            name: label,
          })}
          onClick={onRemove}
        >
          <Trash2 />
        </SettingsIconButton>
      </header>
      <div className="ll:flex ll:flex-col ll:gap-0.5 ll:border-0 ll:border-t ll:border-solid ll:border-border ll:p-1">
        <div className="ll:grid ll:grid-cols-1 ll:gap-0.5 ll:@min-[440px]/settings:grid-cols-2">
          <SettingsRow
            layout="stacked"
            label={t("settings.detector.routing.levelRangeLabel")}
            controlClassName="ll:gap-1"
          >
            <SettingsNumberField
              aria-label={t("settings.detector.routing.minLevelLabel")}
              value={minLevel}
              min={LEVEL_MIN}
              max={LEVEL_MAX}
              onCommit={(value) => onLevelRangeCommit([value, maxLevel])}
            />
            <span
              aria-hidden
              className="ll:text-[13px] ll:text-muted-foreground"
            >
              –
            </span>
            <SettingsNumberField
              aria-label={t("settings.detector.routing.maxLevelLabel")}
              value={maxLevel}
              min={LEVEL_MIN}
              max={LEVEL_MAX}
              onCommit={(value) => onLevelRangeCommit([minLevel, value])}
            />
          </SettingsRow>
          <SettingsRow
            layout="stacked"
            htmlFor={worldInputId}
            label={t("settings.detector.routing.worldLabel")}
            controlClassName="ll:gap-1"
          >
            <SettingsTextField
              id={worldInputId}
              className="ll:w-28"
              placeholder={t("settings.detector.routing.worldPlaceholder")}
              value={world}
              onCommit={onWorldCommit}
            />
            <SettingsIconButton
              label={t("settings.detector.routing.useCurrentWorldLabel")}
              disabled={!canUseCurrentWorld}
              onClick={() => onWorldCommit(currentWorldLabel)}
            >
              <MapPin />
            </SettingsIconButton>
          </SettingsRow>
        </div>
        <SettingsRow
          layout="stacked"
          className="ll:hover:bg-transparent"
          label={
            <span className="ll:flex ll:min-w-0 ll:flex-wrap ll:items-center ll:gap-x-2 ll:gap-y-0.5">
              {t("settings.detector.routing.guildSelectionLabel")}
              {sendsNothing ? (
                <span className="ll:inline-flex ll:items-center ll:gap-1 ll:text-xs ll:leading-4 ll:text-amber-200">
                  <TriangleAlert
                    aria-hidden
                    className="ll:size-3 ll:shrink-0"
                  />
                  {t("settings.detector.routing.noGuildsBadge")}
                </span>
              ) : null}
            </span>
          }
        >
          <SettingsGuildPicker
            aria-label={t("settings.detector.routing.guildPickerLabel", {
              name: label,
            })}
            emptyStateLabel={t("settings.detector.routing.noGuildsAvailable")}
            guilds={guilds}
            onToggle={onToggleGuild}
            selectedGuildIds={selectedGuildIds}
            className="ll:w-full"
          />
        </SettingsRow>
      </div>
    </article>
  );
};
