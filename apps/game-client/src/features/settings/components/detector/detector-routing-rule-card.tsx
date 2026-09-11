import { SettingsCategoryAccordionItem } from "@/components/settings/settings-category-accordion";
import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsGuildPicker } from "@/features/settings/components/shared/settings-guild-picker";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import { Trash2 } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";

type DetectorRoutingRuleCardProps = {
  /** Accordion item id; the tab keeps the open ids. */
  ruleId: string;
  fieldIdInput: ReactNode;
  guilds: Guild[] | undefined;
  label: string;
  minLevel: number;
  maxLevel: number;
  world?: string;
  selectedGuildIds: string[];
  nameInputId: string;
  nameField: ReactNode;
  levelFields: ReactNode;
  worldInputId: string;
  worldField: ReactNode;
  onRemove: () => void;
  onToggleGuild: (guildId: string) => void;
};

/** One routing rule: a collapsible category with its fields as rows. */
export const DetectorRoutingRuleCard: FC<DetectorRoutingRuleCardProps> = ({
  ruleId,
  fieldIdInput,
  guilds,
  label,
  minLevel,
  maxLevel,
  world,
  selectedGuildIds,
  nameInputId,
  nameField,
  levelFields,
  worldInputId,
  worldField,
  onRemove,
  onToggleGuild,
}) => {
  const { t } = useTranslation();

  const summary = [
    t("settings.detector.routing.summaryLevels", {
      min: minLevel,
      max: maxLevel,
    }),
    world ? t("settings.detector.routing.summaryWorld", { world }) : null,
    t("settings.detector.routing.summaryGuilds", {
      count: selectedGuildIds.length,
    }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SettingsCategoryAccordionItem
      id={ruleId}
      title={label}
      summary={summary}
      triggerLabel={t("settings.detector.routing.toggleRuleLabel", {
        name: label,
      })}
      actions={
        <SettingsIconButton
          variant="destructive"
          label={t("settings.detector.routing.deleteRuleLabel", {
            name: label,
          })}
          onClick={onRemove}
        >
          <Trash2 />
        </SettingsIconButton>
      }
    >
      {fieldIdInput}
      <SettingsRow
        htmlFor={nameInputId}
        label={t("settings.detector.routing.ruleNameLabel")}
        description={t("settings.detector.routing.ruleNameDescription")}
        control="wide"
      >
        {nameField}
      </SettingsRow>
      <SettingsRow
        label={t("settings.detector.routing.levelRangeLabel")}
        description={t("settings.detector.routing.levelRangeDescription")}
        controlClassName="ll:gap-1"
      >
        {levelFields}
      </SettingsRow>
      <SettingsRow
        htmlFor={worldInputId}
        label={t("settings.detector.routing.worldLabel")}
        description={t("settings.detector.routing.worldDescription")}
        control="wide"
      >
        {worldField}
      </SettingsRow>
      <SettingsRow
        layout="stacked"
        label={t("settings.detector.routing.guildSelectionLabel")}
        description={t("settings.detector.routing.guildSelectionDescription")}
      >
        <SettingsGuildPicker
          aria-label={t("settings.detector.routing.guildSelectionLabel")}
          emptyStateLabel={t("settings.detector.routing.noGuildsAvailable")}
          guilds={guilds}
          onToggle={onToggleGuild}
          selectedGuildIds={selectedGuildIds}
          className="ll:w-full"
        />
      </SettingsRow>
    </SettingsCategoryAccordionItem>
  );
};
