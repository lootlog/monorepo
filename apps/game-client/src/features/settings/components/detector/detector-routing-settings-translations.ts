import i18n from "@/i18n/config";

export type DetectorRoutingSettingsTranslations = ReturnType<
  typeof getDetectorRoutingSettingsTranslations
>;

export const getDetectorRoutingSettingsTranslations = () => {
  return {
    sectionTitle: i18n.t("settings.detector.routing.sectionTitle"),
    sectionDescription: i18n.t("settings.detector.routing.sectionDescription"),
    addRuleButton: i18n.t("settings.detector.routing.addRuleButton"),
    emptyState: i18n.t("settings.detector.routing.emptyState"),
    ruleLabel: (index: number) =>
      i18n.t("settings.detector.routing.ruleLabel", { index }),
    ruleNameLabel: i18n.t("settings.detector.routing.ruleNameLabel"),
    selectedGuildsBadge: (count: number) =>
      i18n.t("settings.detector.routing.selectedGuildsBadge", { count }),
    minLevelBadge: (level: number) =>
      i18n.t("settings.detector.routing.minLevelBadge", { level }),
    maxLevelBadge: (level: number) =>
      i18n.t("settings.detector.routing.maxLevelBadge", { level }),
    worldBadge: (world: string) =>
      i18n.t("settings.detector.routing.worldBadge", { world }),
    minLevelLabel: i18n.t("settings.detector.routing.minLevelLabel"),
    maxLevelLabel: i18n.t("settings.detector.routing.maxLevelLabel"),
    worldLabel: i18n.t("settings.detector.routing.worldLabel"),
    guildSelectionLabel: i18n.t(
      "settings.detector.routing.guildSelectionLabel",
    ),
    noGuildsSelected: i18n.t("settings.detector.routing.noGuildsSelected"),
    noGuildsAvailable: i18n.t("settings.detector.routing.noGuildsAvailable"),
    deleteRuleLabel: (index: number) =>
      i18n.t("settings.detector.routing.deleteRuleLabel", { index }),
    toggleRuleLabel: (index: number) =>
      i18n.t("settings.detector.routing.toggleRuleLabel", { index }),
    guildOverflowLabel: (count: number) =>
      i18n.t("settings.detector.routing.guildOverflowLabel", { count }),
    guildOverflowTooltip: (count: number) =>
      i18n.t("settings.detector.routing.guildOverflowTooltip", { count }),
  };
};
