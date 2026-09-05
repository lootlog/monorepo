import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { playerSnapshotTable } from "#src/database/drizzle/schema";
import { getProfByShortname } from "#src/shared/margonem/profession";
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
  const snapshotHash = createHash("sha256")
    .update(`${actor.name}${actor.prof ?? ""}${icon}`)
    .digest("hex");
  const inserted = yield* database
    .insert(playerSnapshotTable)
    .values({
      world,
      accountId,
      characterId,
      snapshotHash,
      name: actor.name,
      prof: getProfByShortname(actor.prof ?? ""),
      icon,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];
  const existing = yield* database
    .select()
    .from(playerSnapshotTable)
    .where(
      and(
        eq(playerSnapshotTable.world, world),
        eq(playerSnapshotTable.accountId, accountId),
        eq(playerSnapshotTable.characterId, characterId),
        eq(playerSnapshotTable.snapshotHash, snapshotHash),
      ),
    )
    .limit(1);
  return existing[0] ?? null;
});
