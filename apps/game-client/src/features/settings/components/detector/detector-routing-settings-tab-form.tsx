import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DetectorRoutingRuleCard } from "@/features/settings/components/detector/detector-routing-rule-card";
import { Plus } from "lucide-react";
import {
  useDetectorRoutingForm,
  LEVEL_MIN,
  LEVEL_MAX,
  clampLevel,
  normalizeRoutingRuleText,
  toggleOpenRuleId,
} from "./use-detector-routing-form";

export function DetectorRoutingSettingsTabForm() {
  const {
    guilds,
    translations,
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
    <form className="ll:flex ll:flex-col ll:gap-3 ll:py-1">
      <SettingsSection
        title={translations.sectionTitle}
        description={translations.sectionDescription}
        actions={
          <Button
            type="button"
            onClick={addRoutingRule}
            className="ll:h-7 ll:gap-1.5 ll:px-2.5 ll:text-[11px] ll:font-semibold"
          >
            <Plus size={14} />
            {translations.addRuleButton}
          </Button>
        }
      >
        <div className="ll:grid ll:gap-3">
          {fields.length === 0 && (
            <SettingsEmptyState>{translations.emptyState}</SettingsEmptyState>
          )}

          {fields.map((field, index) => {
            const rule = routingRules[index];
            const ruleId = rule?.id ?? field.id;
            const selectedGuildIds = rule?.guildIds ?? [];
            const normalizedName = normalizeRoutingRuleText(rule?.name);
            const normalizedWorld = normalizeRoutingRuleText(rule?.world);
            const label = normalizedName ?? translations.ruleLabel(index + 1);

            return (
              <DetectorRoutingRuleCard
                key={field.fieldKey}
                fieldIdInput=<input
                  type="hidden"
                  {...register(`routingRules.${index}.id`)}
                />
                guilds={guilds}
                index={index}
                isOpen={visibleOpenRuleIds.has(ruleId)}
                label={label}
                minLevel={rule?.minLevel ?? LEVEL_MIN}
                maxLevel={rule?.maxLevel ?? LEVEL_MAX}
                world={normalizedWorld}
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
                selectedGuildIds={selectedGuildIds}
                translations={translations}
                nameField={
                  <div className="ll:space-y-1">
                    <Label
                      htmlFor={`detector-routing-${field.id}-name`}
                      className="ll:text-[10px] ll:leading-none"
                    >
                      {translations.ruleNameLabel}
                    </Label>
                    <Input
                      id={`detector-routing-${field.id}-name`}
                      type="text"
                      className="ll:h-7 ll:px-2 ll:text-[11px]"
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
                  </div>
                }
                minLevelField={
                  <div className="ll:space-y-1">
                    <Label
                      htmlFor={`detector-routing-${field.id}-min-level`}
                      className="ll:text-[10px] ll:leading-none"
                    >
                      {translations.minLevelLabel}
                    </Label>
                    <Input
                      id={`detector-routing-${field.id}-min-level`}
                      type="number"
                      min={LEVEL_MIN}
                      max={LEVEL_MAX}
                      className="ll:h-7 ll:px-2 ll:text-[11px]"
                      onFocus={() => {
                        setDeferredSyncField(`routingRules.${index}.minLevel`);
                      }}
                      {...register(`routingRules.${index}.minLevel`, {
                        onBlur: () => {
                          setDeferredSyncField(null);
                          syncCurrentValues();
                        },
                        setValueAs: (value) => {
                          if (
                            value === "" ||
                            value === null ||
                            value === undefined
                          ) {
                            return LEVEL_MIN;
                          }

                          const parsedValue = Number(value);

                          if (Number.isNaN(parsedValue)) {
                            return LEVEL_MIN;
                          }

                          return clampLevel(parsedValue);
                        },
                      })}
                    />
                  </div>
                }
                maxLevelField={
                  <div className="ll:space-y-1">
                    <Label
                      htmlFor={`detector-routing-${field.id}-max-level`}
                      className="ll:text-[10px] ll:leading-none"
                    >
                      {translations.maxLevelLabel}
                    </Label>
                    <Input
                      id={`detector-routing-${field.id}-max-level`}
                      type="number"
                      min={LEVEL_MIN}
                      max={LEVEL_MAX}
                      className="ll:h-7 ll:px-2 ll:text-[11px]"
                      onFocus={() => {
                        setDeferredSyncField(`routingRules.${index}.maxLevel`);
                      }}
                      {...register(`routingRules.${index}.maxLevel`, {
                        onBlur: () => {
                          setDeferredSyncField(null);
                          syncCurrentValues();
                        },
                        setValueAs: (value) => {
                          if (
                            value === "" ||
                            value === null ||
                            value === undefined
                          ) {
                            return LEVEL_MAX;
                          }

                          const parsedValue = Number(value);

                          if (Number.isNaN(parsedValue)) {
                            return LEVEL_MAX;
                          }

                          return clampLevel(parsedValue);
                        },
                      })}
                    />
                  </div>
                }
                worldField={
                  <div className="ll:space-y-1">
                    <Label
                      htmlFor={`detector-routing-${field.id}-world`}
                      className="ll:text-[10px] ll:leading-none"
                    >
                      {translations.worldLabel}
                    </Label>
                    <Input
                      id={`detector-routing-${field.id}-world`}
                      type="text"
                      className="ll:h-7 ll:px-2 ll:text-[11px]"
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
                  </div>
                }
              />
            );
          })}
        </div>
      </SettingsSection>
    </form>
  );
}
