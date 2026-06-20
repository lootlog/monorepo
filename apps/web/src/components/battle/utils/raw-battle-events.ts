import type {
  RawBattle,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";

type SourceBattleEvent = {
  f?: {
    m?: unknown;
  };
};

type BattleMoveSide = {
  id: string | null;
  hpPercentage: number | null;
};

const parseHpPercentage = (value: string | undefined): number | null => {
  if (value === undefined || value === "") {
    return null;
  }

  const hpPercentage = Number.parseFloat(value.replace(",", "."));
  if (Number.isNaN(hpPercentage)) {
    return null;
  }

  return hpPercentage;
};

const parseMoveSide = (part: string | undefined): BattleMoveSide => {
  const movePart = part ?? "0";
  const separatorIndex = movePart.indexOf("=");

  if (separatorIndex === -1) {
    return {
      id: movePart !== "0" && movePart !== "" ? movePart : null,
      hpPercentage: null,
    };
  }

  const rawId = movePart.slice(0, separatorIndex);
  const rawHpPercentage = movePart.slice(separatorIndex + 1);

  return {
    id: rawId !== "0" && rawId !== "" ? rawId : null,
    hpPercentage: parseHpPercentage(rawHpPercentage),
  };
};

const parseMoveAction = (
  action: string,
): RawBattleParsedEvent["actions"][number] => {
  const separatorIndex = action.indexOf("=");

  if (separatorIndex === -1) {
    return {
      actionType: action,
      param: "",
    };
  }

  return {
    actionType: action.slice(0, separatorIndex),
    param: action.slice(separatorIndex + 1),
  };
};

const parseMove = (move: string): RawBattleParsedEvent => {
  const [attackerPart, defenderPart, ...actions] = move.split(";");
  const attacker = parseMoveSide(attackerPart);
  const defender = parseMoveSide(defenderPart);

  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    attackerHpPercentage: attacker.hpPercentage,
    defenderHpPercentage: defender.hpPercentage,
    actions: actions.map(parseMoveAction),
  };
};

const isSourceBattleEvent = (event: unknown): event is SourceBattleEvent =>
  typeof event === "object" && event !== null;

export const parseRawBattleSourceEvents = (
  sourceEvents: RawBattle["sourceEvents"],
): RawBattleParsedEvent[] | null => {
  if (!Array.isArray(sourceEvents)) {
    return null;
  }

  const parsedEvents: RawBattleParsedEvent[] = [];

  sourceEvents.forEach((sourceEvent) => {
    if (!isSourceBattleEvent(sourceEvent) || !Array.isArray(sourceEvent.f?.m)) {
      return;
    }

    sourceEvent.f.m.forEach((move) => {
      if (typeof move !== "string") {
        return;
      }

      parsedEvents.push(parseMove(move));
    });
  });

  return parsedEvents.length > 0 ? parsedEvents : null;
};

export const getDisplayBattleEvents = (
  rawBattle: RawBattle,
): RawBattleParsedEvent[] =>
  parseRawBattleSourceEvents(rawBattle.sourceEvents) ?? rawBattle.events;
