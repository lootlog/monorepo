import { SharedRawBattleParsedEvent } from "../../../types/battle";
import {
  ATTACK_ACTIONS_SORT_ORDER,
  isAttackActionInContext,
  isBuffAction,
  isIgnoredAction,
  isOutcomeAction,
  isPassiveActionInContext,
  isSpellActionInContext,
  isSystemAction,
} from "./battle-action-constants";

export type ParsedAction = {
  type: string;
  value: string;
};

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

const createParsedAction = (
  actionType: string,
  param: string
): ParsedAction => ({
  type: actionType,
  value: param,
});

const sortAttackActions = (actions: ParsedAction[]): ParsedAction[] => {
  return actions.sort((a, b) => {
    const sortOrder = ATTACK_ACTIONS_SORT_ORDER as readonly string[];
    const aIndex = sortOrder.indexOf(a.type);
    const bIndex = sortOrder.indexOf(b.type);
    return aIndex - bIndex;
  });
};

const categorizeAction = (
  parsedActions: ParsedActions,
  actionType: string,
  param: string,
  allActionTypes: string[]
): void => {
  const action = createParsedAction(actionType, param);

  if (isSystemAction(actionType)) {
    parsedActions.systemActions.push(action);
  } else if (isSpellActionInContext(actionType, allActionTypes)) {
    parsedActions.spellActions.push(action);
  } else if (isBuffAction(actionType)) {
    parsedActions.buffActions.push(action);
  } else if (isPassiveActionInContext(actionType, allActionTypes)) {
    parsedActions.passiveActions.push(action);
  } else if (isAttackActionInContext(actionType, allActionTypes)) {
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

export const parseActions = (
  actions: SharedRawBattleParsedEvent["actions"]
): ParsedActions => {
  const parsedActions = createEmptyParsedActions();
  const allActionTypes = actions.map((action) => action.actionType);

  actions.forEach((action) => {
    categorizeAction(
      parsedActions,
      action.actionType,
      action.param,
      allActionTypes
    );
  });

  parsedActions.attackActions = sortAttackActions(parsedActions.attackActions);

  return parsedActions;
};

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

export const getActionsByCategory = (
  parsedActions: ParsedActions,
  category: keyof ParsedActions
): ParsedAction[] => {
  return parsedActions[category];
};
