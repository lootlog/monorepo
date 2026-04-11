// Battle Labels
export type { BattleLabels } from "./battle-labels";

// Battle Overview Components
export { BattleOverviewCard } from "./battle-overview-card";
export { BattleOverviewHeader } from "./battle-overview-header";
export { BattleTeamSection } from "./battle-team-section";
export { TeamDisplay } from "./team-display";
export { PlayerTile } from "./player-tile";
export { AnimatedTrophy } from "./animated-trophy";
export { BattleMetadata } from "./battle-metadata";

// Battle Stats Table Components
export { BattleStatsTable } from "./battle-stats-table";
export { OneVsOneStatsTable } from "./one-vs-one-stats-table";
export { StatsCustomizationModal } from "./stats-customization/stats-customization-modal";
export { getBattleStatsTableColumns } from "./battle-stats-table-columns-full";
export { ExpandableDataTable } from "./expandable-data-table";
export { DamageBreakdown } from "./damage-breakdown";
export { LegendaryBonusesBreakdown } from "./legendary-bonuses-breakdown";

// Battle Log Components
export { BattleLog } from "./battle-log";
export { BattleLogList } from "./battle-log-list";
export { BattleEventEntry } from "./battle-event-entry";
export { BattleHeader } from "./battle-header";

// Battle Log Action Components
export { BattleActionItem } from "./actions/battle-action-item";
export { BattleLogAttackActions } from "./actions/battle-log-attack-action";
export { BattleBuffActions } from "./actions/battle-buff-actions";
export { BattleOutcomeActions } from "./actions/battle-outcome-actions";
export { BattlePassiveActions } from "./actions/battle-passive-actions";
export { BattleSpellActions } from "./actions/battle-spell-actions";
export { BattleSystemActions } from "./actions/battle-system-actions";

// Battle Log Utilities
export {
  parseActions,
  hasAnyActions,
  getActionsCount,
  getActionsByCategory,
} from "./utils/battle-actions-parser";
export {
  roundValue,
  roundCommaSeparatedValues,
  roundValueWithSign,
  roundHpPercentage,
  transformAndRoundEnergyMana,
  processDamageValue,
} from "./utils/value-utils";
export {
  generateDynamicValues,
  generateDynamicComponents,
  generateDynamicValuesAndComponents,
} from "./utils/dynamic-values-helper";
export * from "./utils/battle-action-constants";

// Types - Battle Overview
export type { BattleOverviewCardProps } from "./battle-overview-card";
export type { BattleOverviewHeaderProps } from "./battle-overview-header";
export type { BattleTeamSectionProps } from "./battle-team-section";
export type { TeamDisplayProps } from "./team-display";
export type { AnimatedTrophyProps } from "./animated-trophy";
export type { BattleMetadataProps } from "./battle-metadata";

// Types - Battle Log
export type { BattleLogProps } from "./battle-log";
export type { BattleLogListProps } from "./battle-log-list";
export type { BattleEventEntryProps } from "./battle-event-entry";
export type { BattleHeaderProps } from "./battle-header";

// Types - Battle Log Actions
export type { BattleActionItemProps } from "./actions/battle-action-item";
export type { BattleLogAttackActionsProps } from "./actions/battle-log-attack-action";
export type { BattleBuffActionsProps } from "./actions/battle-buff-actions";
export type { BattleOutcomeActionsProps } from "./actions/battle-outcome-actions";
export type { BattlePassiveActionsProps } from "./actions/battle-passive-actions";
export type { BattleSpellActionsProps } from "./actions/battle-spell-actions";
export type { BattleSystemActionsProps } from "./actions/battle-system-actions";

// Types - Utilities
export type {
  ParsedAction,
  ParsedActions,
} from "./utils/battle-actions-parser";
export type { DynamicValuesConfig } from "./utils/dynamic-values-helper";
