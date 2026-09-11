import { NpcTypeChip } from "@/components/settings/npc-type-chip";
import {
  SettingsMatrix,
  type SettingsMatrixColumn,
} from "@/components/settings/settings-matrix";
import { SettingsMatrixRow } from "@/components/settings/settings-matrix-row";
import { SettingsNumberField } from "@/components/settings/settings-number-field";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { NotificationServersRow } from "@/features/settings/components/notifications/notification-servers-row";
import {
  AUTO_HIDE_MAX_SECONDS,
  AUTO_HIDE_MIN_SECONDS,
  useNotificationRulesForm,
} from "@/features/settings/components/notifications/use-notification-rules-form";
import { NpcType } from "@/api/npcs.api";
import type { NotificationType } from "@lootlog/schema/account-preferences";
import { Bell, Globe, Highlighter, TimerOff, Volume2 } from "lucide-react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

type NotificationCategory = {
  label: string;
  key: NotificationType;
};

const SWITCH_COLUMNS = [
  { key: "show", icon: Bell, primary: true },
  { key: "ignoreOtherWorlds", icon: Globe },
  { key: "highlight", icon: Highlighter },
  { key: "sound", icon: Volume2 },
] as const;

export const NotificationsSettingsTab = () => {
  const { t } = useTranslation();

  const { control, guilds, rules, setSwitchForAll, toggleGuild } =
    useNotificationRulesForm();

  const categories: NotificationCategory[] = [
    { label: t("common:npcTypes.elite2"), key: NpcType.ELITE2 },
    { label: t("common:npcTypes.hero"), key: NpcType.HERO },
    { label: t("common:npcTypes.colossus"), key: NpcType.COLOSSUS },
    { label: t("common:npcTypes.titan"), key: NpcType.TITAN },
    { label: t("common:npcTypes.message"), key: "message" },
    { label: t("common:npcTypes.partyGathering"), key: "party-gathering" },
  ];

  const columns: SettingsMatrixColumn[] = [
    ...SWITCH_COLUMNS.map((column) => {
      const editableRules = categories.flatMap((category) => {
        const rule = rules[category.key];

        return column.key === "show" || rule.show ? [rule] : [];
      });

      return {
        key: column.key,
        icon: column.icon,
        primary: "primary" in column,
        label: t(`settings.notifications.toggles.${column.key}`),
        description: t(
          `settings.notifications.toggles.${column.key}Description`,
        ),
        bulk: {
          checked:
            editableRules.length > 0 &&
            editableRules.every((rule) => rule[column.key]),
          onChange: (checked: boolean) => setSwitchForAll(column.key, checked),
        },
      };
    }),
    {
      key: "autoHideTimeout",
      icon: TimerOff,
      label: t("settings.notifications.autoHideLabel"),
      description: t("settings.notifications.autoHideDescription"),
    },
  ];

  const guildCount = guilds?.length ?? 0;

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="notification-rules"
        title={t("settings.notifications.rulesTitle")}
        description={t("settings.notifications.rulesDescription")}
      >
        <SettingsMatrix
          label={t("settings.notifications.rulesTitle")}
          rowHeader={t("settings.notifications.categoryHeader")}
          columns={columns}
        >
          {categories.map((category) => {
            const enabled = rules[category.key].show;

            const cellLabel = (setting: string) =>
              t("settings.notifications.cellLabel", {
                category: category.label,
                setting,
              });

            return (
              <SettingsMatrixRow
                key={category.key}
                dimmed={!enabled}
                title={
                  <NpcTypeChip npcType={category.key}>
                    {category.label}
                  </NpcTypeChip>
                }
                cells={[
                  ...SWITCH_COLUMNS.map((column) => {
                    const isDisabled = column.key !== "show" && !enabled;

                    return (
                      <Controller
                        key={column.key}
                        name={`rules.${category.key}.${column.key}`}
                        control={control}
                        render={({ field }) => (
                          <Switch
                            id={`${category.key}-${column.key}`}
                            aria-label={cellLabel(
                              t(`settings.notifications.toggles.${column.key}`),
                            )}
                            checked={field.value}
                            disabled={isDisabled}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    );
                  }),
                  <Controller
                    key="autoHideTimeout"
                    name={`rules.${category.key}.autoHideTimeout`}
                    control={control}
                    render={({ field }) => (
                      <SettingsNumberField
                        id={`${category.key}-auto-hide-timeout`}
                        aria-label={cellLabel(
                          t("settings.notifications.autoHideLabel"),
                        )}
                        value={field.value ?? 0}
                        min={AUTO_HIDE_MIN_SECONDS}
                        max={AUTO_HIDE_MAX_SECONDS}
                        unit="s"
                        variant="cell"
                        disabled={!enabled}
                        onCommit={field.onChange}
                      />
                    )}
                  />,
                ]}
              />
            );
          })}
        </SettingsMatrix>
      </SettingsSection>
      <SettingsSection
        controlId="notification-servers"
        title={t("settings.notifications.serversTitle")}
        description={t("settings.notifications.serversDescription")}
      >
        {categories.map((category) => {
          const categoryRules = rules[category.key];

          return (
            <NotificationServersRow
              key={category.key}
              title={
                <NpcTypeChip npcType={category.key}>
                  {category.label}
                </NpcTypeChip>
              }
              label={t("settings.notifications.serversPickerLabel", {
                category: category.label,
              })}
              summary={
                categoryRules.show
                  ? t("settings.notifications.serversSelected", {
                      selected: categoryRules.guildIds.length,
                      total: guildCount,
                    })
                  : t("settings.notifications.summaryDisabled")
              }
              guilds={guilds}
              selectedGuildIds={categoryRules.guildIds}
              disabled={!categoryRules.show}
              emptyStateLabel={t("settings.notifications.emptyGuilds")}
              onToggle={(guildId) => toggleGuild(category.key, guildId)}
            />
          );
        })}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
