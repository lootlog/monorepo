import { NpcTypeChip } from "@/components/settings/npc-type-chip";
import {
  SettingsMatrix,
  type SettingsMatrixColumn,
} from "@/components/settings/settings-matrix";
import { SettingsMatrixRow } from "@/components/settings/settings-matrix-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { useDetectorTypesForm } from "@/features/settings/components/detector/use-detector-types-form";
import { NpcType } from "@/api/npcs.api";
import type { DetectorNpcType } from "@lootlog/schema/account-preferences";
import { AppWindow, Highlighter, Radar, Send, Volume2 } from "lucide-react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

const COLUMNS = [
  { key: "detect", icon: Radar, primary: true },
  { key: "autoSend", icon: Send },
  { key: "notifyWindow", icon: AppWindow },
  { key: "highlight", icon: Highlighter },
  { key: "notifySound", icon: Volume2 },
] as const;

export const DetectorSettingsTab = () => {
  const { t } = useTranslation();
  const { control, setSwitchForAll, types } = useDetectorTypesForm();

  const categories: Array<{ label: string; key: DetectorNpcType }> = [
    { label: t("common:npcTypes.elite2"), key: NpcType.ELITE2 },
    { label: t("common:npcTypes.hero"), key: NpcType.HERO },
    { label: t("common:npcTypes.colossus"), key: NpcType.COLOSSUS },
    { label: t("common:npcTypes.titan"), key: NpcType.TITAN },
  ];

  const columns: SettingsMatrixColumn[] = COLUMNS.map((column) => {
    const editableTypes = categories.flatMap((category) => {
      const type = types[category.key];

      return column.key === "detect" || type.detect ? [type] : [];
    });

    return {
      key: column.key,
      icon: column.icon,
      primary: "primary" in column,
      label: t(`settings.detector.toggles.${column.key}`),
      description: t(`settings.detector.toggles.${column.key}Description`),
      bulk: {
        checked:
          editableTypes.length > 0 &&
          editableTypes.every((type) => type[column.key]),
        onChange: (checked: boolean) => setSwitchForAll(column.key, checked),
      },
    };
  });

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="detector-types"
        title={t("settings.detector.typesTitle")}
        description={t("settings.detector.description")}
      >
        <SettingsMatrix
          label={t("settings.detector.typesTitle")}
          rowHeader={t("settings.detector.categoryHeader")}
          columns={columns}
        >
          {categories.map((category) => {
            const enabled = types[category.key].detect;

            return (
              <SettingsMatrixRow
                key={category.key}
                dimmed={!enabled}
                title={
                  <NpcTypeChip npcType={category.key}>
                    {category.label}
                  </NpcTypeChip>
                }
                cells={COLUMNS.map((column) => {
                  const isDisabled = column.key !== "detect" && !enabled;

                  return (
                    <Controller
                      key={column.key}
                      name={`types.${category.key}.${column.key}`}
                      control={control}
                      render={({ field }) => (
                        <Switch
                          id={`${category.key}-${column.key}`}
                          aria-label={t("settings.detector.cellLabel", {
                            category: category.label,
                            setting: t(
                              `settings.detector.toggles.${column.key}`,
                            ),
                          })}
                          checked={field.value}
                          disabled={isDisabled}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  );
                })}
              />
            );
          })}
        </SettingsMatrix>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
