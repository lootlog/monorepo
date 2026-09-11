import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsNumberField } from "@/components/settings/settings-number-field";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsGuildPicker } from "@/features/settings/components/shared/settings-guild-picker";
import {
  LEVEL_MAX,
  LEVEL_MIN,
} from "@/features/settings/components/detector/use-detector-routing-form";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import { MapPin, Trash2, TriangleAlert } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";

type DetectorRoutingRuleProps = {
  /** 1-based position; the fallback name and the badge. */
  index: number;
  fieldIdInput: ReactNode;
  guilds: Guild[] | undefined;
  /** Trimmed rule name, or undefined when the field is blank. */
  name?: string;
  minLevel: number;
  maxLevel: number;
  /** Trimmed world filter, or undefined when the rule covers every world. */
  world?: string;
  /** World the player is on right now; offered as a one-click fill. */
  currentWorld?: string;
  selectedGuildIds: string[];
  nameField: ReactNode;
  worldInputId: string;
  worldField: ReactNode;
  onRemove: () => void;
  onToggleGuild: (guildId: string) => void;
  onLevelRangeCommit: (range: [number, number]) => void;
  onUseCurrentWorld: (world: string) => void;
};

/**
 * One delivery rule, always fully visible: a numbered header with the name
 * and the three conditions as rows.
 */
export const DetectorRoutingRule: FC<DetectorRoutingRuleProps> = ({
  index,
  fieldIdInput,
  guilds,
  name,
  minLevel,
  maxLevel,
  world,
  currentWorld,
  selectedGuildIds,
  nameField,
  worldInputId,
  worldField,
  onRemove,
  onToggleGuild,
  onLevelRangeCommit,
  onUseCurrentWorld,
}) => {
  const { t } = useTranslation();

  const label = name ?? t("settings.detector.routing.ruleLabel", { index });
  const guildCount = guilds?.length ?? 0;
  const selectedCount = selectedGuildIds.length;

  const canUseCurrentWorld =
    !!currentWorld &&
    currentWorld !== "unknown" &&
    currentWorld.toLowerCase() !== world?.toLowerCase();

  // World names are matched case-insensitively; show the game's lowercase
  // value the way the world selector does.
  const currentWorldLabel = currentWorld
    ? currentWorld.charAt(0).toUpperCase() + currentWorld.slice(1)
    : "";

  return (
    <article
      aria-label={label}
      className="ll:flex ll:flex-col ll:rounded-sm ll:bg-black/25"
    >
      {fieldIdInput}
      <header className="ll:flex ll:min-h-7 ll:items-center ll:gap-2 ll:ps-2 ll:pe-1 ll:py-1">
        <span
          aria-hidden
          className="ll:flex ll:size-5 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:bg-primary/20 ll:text-xs ll:font-semibold ll:tabular-nums ll:text-primary"
        >
          {index}
        </span>
        <div className="ll:min-w-0 ll:flex-1">{nameField}</div>
        {selectedCount === 0 ? (
          <span className="ll:flex ll:shrink-0 ll:items-center ll:gap-1 ll:rounded-sm ll:bg-amber-200/10 ll:px-1.5 ll:py-0.5 ll:text-xs ll:leading-4 ll:text-amber-200">
            <TriangleAlert aria-hidden className="ll:size-3 ll:shrink-0" />
            {t("settings.detector.routing.noGuildsBadge")}
          </span>
        ) : null}
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
      <div className="ll:flex ll:flex-col ll:gap-0.5 ll:border-0 ll:border-t ll:border-solid ll:border-border ll:py-1">
        <SettingsRow
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
          <span aria-hidden className="ll:text-[13px] ll:text-muted-foreground">
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
          htmlFor={worldInputId}
          label={t("settings.detector.routing.worldLabel")}
          description={t("settings.detector.routing.worldDescription")}
          controlClassName="ll:gap-1"
        >
          {worldField}
          <SettingsIconButton
            label={t("settings.detector.routing.useCurrentWorldLabel")}
            disabled={!canUseCurrentWorld}
            onClick={() => onUseCurrentWorld(currentWorldLabel)}
          >
            <MapPin />
          </SettingsIconButton>
        </SettingsRow>
        <SettingsRow
          layout="stacked"
          label={t("settings.detector.routing.guildSelectionLabel")}
          description={t(
            "settings.detector.routing.guildSelectionDescription",
            {
              selected: selectedCount,
              total: guildCount,
            },
          )}
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
