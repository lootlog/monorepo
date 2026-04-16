const DETECTOR_ROUTING_SETTINGS_TRANSLATIONS = {
  sectionTitle: "Routing na serwery",
  sectionDescription:
    "Wspólny routing dla całego wykrywacza. Nakładające się zakresy wysyłają komunikaty na wszystkie dopasowane serwery. Zakres leveli dotyczy poziomu NPC, nie gracza.",
  addRuleButton: "Dodaj regułę",
  emptyState:
    "Brak reguł routingu. Detector będzie działał lokalnie bez wysyłki na Discord.",
  ruleLabel: (index: number) => `Reguła ${index}`,
  selectedGuildsBadge: (count: number) => `Serwery ${count}`,
  minLevelBadge: (level: number) => `Od ${level}`,
  maxLevelBadge: (level: number) => `Do ${level}`,
  minLevelLabel: "Od levela",
  maxLevelLabel: "Do levela",
  guildSelectionLabel: "Na jakie serwery wysyłać",
  noGuildsSelected: "Brak serwerów",
  noGuildsAvailable: "Brak serwerów do wyboru.",
  deleteRuleLabel: (index: number) => `Usuń regułę ${index}`,
  toggleRuleLabel: (index: number) => `Przełącz regułę ${index}`,
  guildOverflowLabel: (count: number) => `+${count}`,
  guildOverflowTooltip: (count: number) => `${count} kolejnych serwerów`,
} as const;

export type DetectorRoutingSettingsTranslations =
  typeof DETECTOR_ROUTING_SETTINGS_TRANSLATIONS;

export const getDetectorRoutingSettingsTranslations =
  (): DetectorRoutingSettingsTranslations => {
    return DETECTOR_ROUTING_SETTINGS_TRANSLATIONS;
  };
