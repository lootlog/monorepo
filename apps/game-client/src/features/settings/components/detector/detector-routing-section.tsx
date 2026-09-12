import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { DetectorRoutingRule } from "@/features/settings/components/detector/detector-routing-rule";
import { useDetectorRoutingForm } from "@/features/settings/components/detector/use-detector-routing-form";
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
    routingRules,
    addRoutingRule,
    removeRule,
    toggleGuild,
    setLevelRange,
    setWorld,
    setName,
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
      contentClassName="ll:gap-2"
    >
      {routingRules.length === 0 ? (
        <SettingsEmptyState>
          {t("settings.detector.routing.emptyState")}
        </SettingsEmptyState>
      ) : null}

      {routingRules.map((rule, index) => (
        <DetectorRoutingRule
          key={rule.id}
          index={index + 1}
          guilds={guilds}
          name={rule.name ?? ""}
          minLevel={rule.minLevel}
          maxLevel={rule.maxLevel}
          world={rule.world ?? ""}
          currentWorld={currentWorld}
          selectedGuildIds={rule.guildIds}
          onRemove={() => removeRule(rule.id)}
          onToggleGuild={(guildId) => toggleGuild(rule.id, guildId)}
          onLevelRangeCommit={(range) => setLevelRange(rule.id, range)}
          onWorldCommit={(world) => setWorld(rule.id, world)}
          onNameCommit={(name) => setName(rule.id, name)}
        />
      ))}
    </SettingsSection>
  );
};
