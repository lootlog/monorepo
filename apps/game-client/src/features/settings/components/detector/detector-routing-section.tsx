import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetectorRoutingRule } from "@/features/settings/components/detector/detector-routing-rule";
import {
  LEVEL_MAX,
  LEVEL_MIN,
  normalizeRoutingRuleText,
  useDetectorRoutingForm,
} from "@/features/settings/components/detector/use-detector-routing-form";
import { useGameStore } from "@/store/game.store";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Where detections go: every delivery rule stays expanded, so the player sees
 * each level range, world and server list without opening anything.
 */
export const DetectorRoutingSection = () => {
  const { t } = useTranslation();
  const currentWorld = useGameStore((state) => state.game?.world);

  const {
    guilds,
    setDeferredSyncField,
    register,
    fields,
    remove,
    routingRules,
    syncCurrentValues,
    toggleGuild,
    setLevelRange,
    setWorld,
    addRoutingRule,
  } = useDetectorRoutingForm();

  const addButton = (
    <Button type="button" variant="outline" size="sm" onClick={addRoutingRule}>
      <Plus aria-hidden />
      {t("settings.detector.routing.addRuleButton")}
    </Button>
  );

  return (
    <SettingsSection
      controlId="detector-routing"
      title={t("settings.detector.routing.sectionTitle")}
      description={t("settings.detector.routing.sectionDescription")}
      actions={addButton}
      className="ll:mt-4 ll:[section+&]:before:-top-5"
      contentClassName="ll:gap-1.5"
    >
      {fields.length === 0 ? (
        <SettingsEmptyState>
          {t("settings.detector.routing.emptyState")}
        </SettingsEmptyState>
      ) : null}

      {fields.map((field, index) => {
        const rule = routingRules[index];
        const name = normalizeRoutingRuleText(rule?.name);
        const nameInputId = `detector-routing-${field.id}-name`;
        const worldInputId = `detector-routing-${field.id}-world`;

        return (
          <DetectorRoutingRule
            key={field.fieldKey}
            index={index + 1}
            fieldIdInput=<input
              type="hidden"
              {...register(`routingRules.${index}.id`)}
            />
            guilds={guilds}
            name={name}
            minLevel={rule?.minLevel ?? LEVEL_MIN}
            maxLevel={rule?.maxLevel ?? LEVEL_MAX}
            world={normalizeRoutingRuleText(rule?.world)}
            currentWorld={currentWorld}
            selectedGuildIds={rule?.guildIds ?? []}
            onRemove={() => remove(index)}
            onToggleGuild={(guildId) => toggleGuild(index, guildId)}
            onLevelRangeCommit={(range) => setLevelRange(index, range)}
            onUseCurrentWorld={(world) => setWorld(index, world)}
            nameField=<Input
              id={nameInputId}
              type="text"
              variant="borderless"
              aria-label={t("settings.detector.routing.ruleNameLabel")}
              placeholder={t("settings.detector.routing.ruleNamePlaceholder", {
                index: index + 1,
              })}
              className="ll:w-full ll:px-1 ll:text-[13px] ll:font-semibold ll:focus-visible:shadow-[inset_0_0_0_1px_var(--color-ring)]"
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
            worldInputId={worldInputId}
            worldField=<Input
              id={worldInputId}
              type="text"
              className="ll:w-28"
              placeholder={t("settings.detector.routing.worldPlaceholder")}
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
  );
};
