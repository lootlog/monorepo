import type { RawBattleParsedEvent } from "@/lib/api/battlelog-types";
import {
  isAttackActionInContext,
  isBuffAction,
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
  param: string,
): ParsedAction => ({
  type: actionType,
  value: param,
});

const categorizeAction = (
  parsedActions: ParsedActions,
  actionType: string,
  param: string,
  allActionTypes: string[],
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
  }
};

export const parseActions = (
  actions: RawBattleParsedEvent["actions"],
): ParsedActions => {
  const parsedActions = createEmptyParsedActions();
  const allActionTypes = actions.map((action) => action.actionType);

  actions.forEach((action) => {
    categorizeAction(
      parsedActions,
      action.actionType,
      action.param,
      allActionTypes,
    );
  });
  return parsedActions;
};
