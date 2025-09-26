import { RawBattleParsedEvent } from "@/hooks/api/battle-log/use-battle-raw";
import {
  ATTACK_ACTIONS_SORT_ORDER,
  isAttackAction,
  isBuffAction,
  isIgnoredAction,
  isOutcomeAction,
  isPassiveAction,
  isSpellAction,
  isSystemAction,
} from "./battle-action-constants";

/**
 * Parsed action item structure
 */
export type ParsedAction = {
  type: string;
  value: string;
};

/**
 * Categorized parsed actions from battle events
 */
export type ParsedActions = {
  systemActions: ParsedAction[];
  buffActions: ParsedAction[];
  debuffActions: ParsedAction[];
  passiveActions: ParsedAction[];
  spellActions: ParsedAction[];
  attackActions: ParsedAction[];
  defendActions: ParsedAction[];
  outcomeActions: ParsedAction[];
};

/**
 * Creates empty parsed actions structure
 */
const createEmptyParsedActions = (): ParsedActions => ({
  systemActions: [],
  buffActions: [],
  debuffActions: [],
  passiveActions: [],
  spellActions: [],
  attackActions: [],
  defendActions: [],
  outcomeActions: [],
});

/**
 * Creates parsed action from raw action
 */
const createParsedAction = (
  actionType: string,
  param: string
): ParsedAction => ({
  type: actionType,
  value: param,
});

/**
 * Sorts attack actions according to predefined order
 */
const sortAttackActions = (actions: ParsedAction[]): ParsedAction[] => {
  return actions.sort((a, b) => {
    const sortOrder = ATTACK_ACTIONS_SORT_ORDER as readonly string[];
    const aIndex = sortOrder.indexOf(a.type);
    const bIndex = sortOrder.indexOf(b.type);
    return aIndex - bIndex;
  });
};

/**
 * Categorizes a single action into the appropriate category
 */
const categorizeAction = (
  parsedActions: ParsedActions,
  actionType: string,
  param: string
): void => {
  const action = createParsedAction(actionType, param);

  if (isSystemAction(actionType)) {
    parsedActions.systemActions.push(action);
  } else if (isSpellAction(actionType)) {
    parsedActions.spellActions.push(action);
  } else if (isBuffAction(actionType)) {
    parsedActions.buffActions.push(action);
  } else if (isPassiveAction(actionType)) {
    parsedActions.passiveActions.push(action);
  } else if (isAttackAction(actionType)) {
    parsedActions.attackActions.push(action);
  } else if (isOutcomeAction(actionType)) {
    parsedActions.outcomeActions.push(action);
  } else if (isIgnoredAction(actionType)) {
    // Skip ignored actions like "skillId"
    return;
  } else {
    // Log unknown action types for debugging
    console.warn(`Unknown action type: ${actionType}, param: ${param}`);
  }
};

/**
 * Parses raw battle event actions into categorized structure
 *
 * @param actions - Raw battle event actions
 * @returns Categorized parsed actions
 *
 * @example
 * ```typescript
 * const rawActions = [
 *   { actionType: "+dmgd", param: "150" },
 *   { actionType: "heal", param: "50" },
 *   { actionType: "winner", param: "PlayerName" }
 * ];
 *
 * const parsed = parseActions(rawActions);
 * // parsed.attackActions = [{ type: "+dmgd", value: "150" }]
 * // parsed.passiveActions = [{ type: "heal", value: "50" }]
 * // parsed.outcomeActions = [{ type: "winner", value: "PlayerName" }]
 * ```
 */
export const parseActions = (
  actions: RawBattleParsedEvent["actions"]
): ParsedActions => {
  const parsedActions = createEmptyParsedActions();

  // Process each raw action
  actions.forEach((action) => {
    categorizeAction(parsedActions, action.actionType, action.param);
  });

  // Sort attack actions for proper display order
  parsedActions.attackActions = sortAttackActions(parsedActions.attackActions);

  return parsedActions;
};

/**
 * Utility function to check if parsed actions have any content
 */
export const hasAnyActions = (parsedActions: ParsedActions): boolean => {
  return (
    parsedActions.systemActions.length > 0 ||
    parsedActions.buffActions.length > 0 ||
    parsedActions.debuffActions.length > 0 ||
    parsedActions.passiveActions.length > 0 ||
    parsedActions.spellActions.length > 0 ||
    parsedActions.attackActions.length > 0 ||
    parsedActions.defendActions.length > 0 ||
    parsedActions.outcomeActions.length > 0
  );
};

/**
 * Get count of all parsed actions
 */
export const getActionsCount = (parsedActions: ParsedActions): number => {
  return (
    parsedActions.systemActions.length +
    parsedActions.buffActions.length +
    parsedActions.debuffActions.length +
    parsedActions.passiveActions.length +
    parsedActions.spellActions.length +
    parsedActions.attackActions.length +
    parsedActions.defendActions.length +
    parsedActions.outcomeActions.length
  );
};

/**
 * Get actions by category name
 */
export const getActionsByCategory = (
  parsedActions: ParsedActions,
  category: keyof ParsedActions
): ParsedAction[] => {
  return parsedActions[category];
};