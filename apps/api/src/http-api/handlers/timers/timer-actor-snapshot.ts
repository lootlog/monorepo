import { createPlayerSnapshotHash } from "@lootlog/database/snapshot-hash";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { resolvePlayerSnapshots } from "#src/shared/margonem/player-snapshot.persistence";
import { getProfByShortname } from "@lootlog/domain/profession";
import type { ResetTimerRequest } from "#src/contracts/timers/schemas";

export const upsertActorCharacter = Effect.fnUntraced(function* (
  database: Pick<typeof ApiDatabase.Service, "insert" | "select">,
  world: string,
  actor: ResetTimerRequest["actorCharacter"],
) {
  if (!actor) return null;
  const characterId = Number.parseInt(actor.characterId, 10);
  const accountId = Number.parseInt(actor.accountId, 10);
  if (Number.isNaN(characterId) || Number.isNaN(accountId)) return null;
  const icon = actor.icon ?? "";
  const snapshotHash = createPlayerSnapshotHash(
    actor.name,
    actor.prof ?? "",
    icon,
  );
  const snapshots = yield* resolvePlayerSnapshots(database, [
    {
      world,
      accountId,
      characterId,
      snapshotHash,
      name: actor.name,
      prof: getProfByShortname(actor.prof ?? "") ?? null,
      icon,
    },
  ]);
  return snapshots[0] ?? null;
});
