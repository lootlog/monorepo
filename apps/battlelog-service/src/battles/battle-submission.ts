import { createHash } from "node:crypto";
import type { CreateBattleDto } from "./dto/create-battle.dto";

type BattleEvent = CreateBattleDto["events"][number];

export const normalizeBattleEvents = (
  events: CreateBattleDto["events"],
): CreateBattleDto["events"] => {
  const seenEventIds = new Set<number>();

  return events.filter((event) => {
    if (event.ev === undefined) return true;
    if (seenEventIds.has(event.ev)) return false;
    seenEventIds.add(event.ev);
    return true;
  });
};

export const normalizeBattleSubmission = (
  data: CreateBattleDto,
): CreateBattleDto => ({
  ...data,
  events: normalizeBattleEvents(data.events),
});

const getLastDefined = <Value>(
  events: BattleEvent[],
  getValue: (event: BattleEvent) => Value | undefined,
): Value | undefined => {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const value = getValue(events[index]);
    if (value !== undefined) return value;
  }
  return undefined;
};

export const createBattleSemanticFingerprint = ({
  data,
  userId,
}: {
  data: CreateBattleDto;
  userId: string;
}): string => {
  const warriors = new Map<
    string,
    NonNullable<BattleEvent["f"]["w"]>[string]
  >();
  for (const event of data.events) {
    for (const [warriorId, warrior] of Object.entries(event.f.w ?? {})) {
      warriors.set(warriorId, warrior);
    }
  }

  const semanticBattle = {
    accountId: data.accountId,
    characterId: data.characterId,
    matchmaking: data.matchmaking,
    matchmakingState: getLastDefined(
      data.events,
      (event) => event.matchmaking_state,
    ),
    matchSummary: getLastDefined(data.events, (event) => event.match_summary),
    moves: data.events.flatMap((event) => event.f.m ?? []),
    userId,
    warriors: [...warriors.entries()]
      .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
      .map(([id, warrior]) => ({ id, ...warrior })),
    world: data.world,
  };

  return createHash("sha256")
    .update(JSON.stringify(semanticBattle))
    .digest("hex");
};
