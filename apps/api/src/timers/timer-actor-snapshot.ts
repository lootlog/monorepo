import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  parseCharacterIdentity,
  resolvePlayerSnapshots,
} from "#src/shared/margonem/player-snapshot.persistence";
import { getProfByShortname } from "@lootlog/domain/profession";
import type { ResetTimerRequest } from "#src/contracts/timers/schemas";

export const upsertActorCharacter = Effect.fnUntraced(function* (
  database: Pick<typeof ApiDatabase.Service, "insert" | "select">,
  world: string,
  actor: ResetTimerRequest["actorCharacter"],
) {
  if (!actor) return null;
  const identity = parseCharacterIdentity(actor.characterId, actor.accountId);

  if (!identity) return null;

  const snapshots = yield* resolvePlayerSnapshots(database, [
    {
      world,
      ...identity,
      name: actor.name,
      prof: getProfByShortname(actor.prof ?? "") ?? null,
      icon: actor.icon ?? null,
    },
  ]);

  return snapshots[0] ?? null;
});
