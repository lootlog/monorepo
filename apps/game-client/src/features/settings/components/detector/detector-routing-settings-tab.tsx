import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsNumberField } from "@/components/settings/settings-number-field";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetectorRoutingRuleCard } from "@/features/settings/components/detector/detector-routing-rule-card";
import {
  LEVEL_MAX,
  LEVEL_MIN,
  normalizeRoutingRuleText,
  toggleOpenRuleId,
  useDetectorRoutingForm,
} from "@/features/settings/components/detector/use-detector-routing-form";
import { Plus } from "lucide-react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export const DetectorRoutingSettingsTab = () => {
  const { t } = useTranslation();

  const {
    guilds,
    control,
    setDeferredSyncField,
    setOpenRuleIds,
    register,
    fields,
    remove,
    routingRules,
    visibleOpenRuleIds,
    syncCurrentValues,
    toggleGuild,
    addRoutingRule,
  } = useDetectorRoutingForm();

  return (
    <SettingsTabLayout
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRoutingRule}
        >
          <Plus aria-hidden />
          {t("settings.detector.routing.addRuleButton")}
        </Button>
      }
    >
      <SettingsSection
        controlId="detector-routing"
        title={t("settings.detector.routing.sectionTitle")}
        description={t("settings.detector.routing.sectionDescription")}
        contentClassName="ll:gap-1"
      >
        {fields.length === 0 ? (
          <SettingsEmptyState>
            {t("settings.detector.routing.emptyState")}
          </SettingsEmptyState>
        ) : null}

        {fields.map((field, index) => {
          const rule = routingRules[index];
          const ruleId = rule?.id ?? field.id;
          const selectedGuildIds = rule?.guildIds ?? [];

          const label =
            normalizeRoutingRuleText(rule?.name) ??
            t("settings.detector.routing.ruleLabel", { index: index + 1 });

          const nameInputId = `detector-routing-${field.id}-name`;
          const worldInputId = `detector-routing-${field.id}-world`;

          return (
            <DetectorRoutingRuleCard
              key={field.fieldKey}
              fieldIdInput=<input
                type="hidden"
                {...register(`routingRules.${index}.id`)}
              />
              guilds={guilds}
              isOpen={visibleOpenRuleIds.has(ruleId)}
              label={label}
              minLevel={rule?.minLevel ?? LEVEL_MIN}
              maxLevel={rule?.maxLevel ?? LEVEL_MAX}
              world={normalizeRoutingRuleText(rule?.world)}
              selectedGuildIds={selectedGuildIds}
              onOpenChange={(open) => {
                setOpenRuleIds((currentOpenRuleIds) =>
                  toggleOpenRuleId(currentOpenRuleIds, ruleId, open),
                );
              }}
              onRemove={() => {
                setOpenRuleIds((currentOpenRuleIds) =>
                  currentOpenRuleIds.filter(
                    (currentRuleId) => currentRuleId !== ruleId,
                  ),
                );
                remove(index);
              }}
              onToggleGuild={(guildId) => toggleGuild(index, guildId)}
              nameInputId={nameInputId}
              nameField=<Input
                id={nameInputId}
                type="text"
                className="ll:w-full"
                onFocus={() => {
                  setDeferredSyncField(`routingRules.${index}.name`);
                }}
                {...register(`routingRules.${index}.name`, {
                  onBlur: () => {
                    setDeferredSyncField(null);
                    syncCurrentValues();
                  },
                })}
              />
              levelFields={
                <>
                  <Controller
                    name={`routingRules.${index}.minLevel`}
                    control={control}
                    render={({ field: levelField }) => (
                      <SettingsNumberField
                        aria-label={t(
                          "settings.detector.routing.minLevelLabel",
                        )}
                        value={levelField.value}
                        min={LEVEL_MIN}
                        max={LEVEL_MAX}
                        onCommit={(value) => {
                          levelField.onChange(value);
                          syncCurrentValues();
                        }}
                      />
                    )}
                  />
                  <span
                    aria-hidden
                    className="ll:text-xs ll:text-muted-foreground"
                  >
                    –
                  </span>
                  <Controller
                    name={`routingRules.${index}.maxLevel`}
                    control={control}
                    render={({ field: levelField }) => (
                      <SettingsNumberField
                        aria-label={t(
                          "settings.detector.routing.maxLevelLabel",
                        )}
                        value={levelField.value}
                        min={LEVEL_MIN}
                        max={LEVEL_MAX}
                        onCommit={(value) => {
                          levelField.onChange(value);
                          syncCurrentValues();
                        }}
                      />
                    )}
                  />
                </>
              }
              worldInputId={worldInputId}
              worldField=<Input
                id={worldInputId}
                type="text"
                className="ll:w-full"
                onFocus={() => {
                  setDeferredSyncField(`routingRules.${index}.world`);
                }}
                {...register(`routingRules.${index}.world`, {
                  onBlur: () => {
                    setDeferredSyncField(null);
                    syncCurrentValues();
                  },
                })}
              />
            />
          );
        })}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
