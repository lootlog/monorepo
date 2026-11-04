import { Option, Schema } from "effect";
import { withFallback } from "@/lib/lenient-schema";
import type {
  RawBattle,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";

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

const decodeSourceBattleEvents = Schema.decodeUnknownOption(
  Schema.Array(
    withFallback(
      Schema.NullOr(
        Schema.Struct({
          f: Schema.Struct({
            m: Schema.Array(withFallback(Schema.NullOr(Schema.String), null)),
          }),
        }),
      ),
      null,
    ),
  ),
);

export const parseRawBattleSourceEvents = (
  sourceEvents: RawBattle["sourceEvents"],
): RawBattleParsedEvent[] | null => {
  const result = decodeSourceBattleEvents(sourceEvents);

  if (Option.isNone(result)) return null;

  const parsedEvents = result.value.flatMap(
    (event) =>
      event?.f.m.flatMap((move) => (move === null ? [] : [parseMove(move)])) ??
      [],
  );

  return parsedEvents.length > 0 ? parsedEvents : null;
};

export const getDisplayBattleEvents = (
  rawBattle: RawBattle,
): RawBattleParsedEvent[] =>
  parseRawBattleSourceEvents(rawBattle.sourceEvents) ?? rawBattle.events;
