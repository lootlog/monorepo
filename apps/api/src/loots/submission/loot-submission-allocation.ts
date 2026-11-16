import { Effect } from "effect";
import { LootShareSourceEnum as LootShareSource } from "@lootlog/schema/loot";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import type { CreateLootRequest } from "#src/contracts/loots/schemas";
import type { LootShare } from "#src/loots/loot-response.schema";
import type { LootSubmissionAcceptancePersistence } from "#src/loots/submission/loot-submission-acceptance.repository";

import { normalizeCharacterAndAccount } from "./loot-submission-normalization.js";

function mapItemOwnerAllocation(
  loots: CreateLootRequest["loots"],
  players: CreateLootRequest["players"],
): LootShare | null {
  if (loots.length === 0 || loots.length !== players.length) return null;
  const shareByCharacter = new Map<number, string>();
  const shareIds = new Set<string>();

  for (const player of players) {
    const { accountId, characterId } = normalizeCharacterAndAccount(
      player.id,
      player.accountId,
    );

    const shareId = `${characterId}${accountId}`;

    if (shareByCharacter.has(player.id) || shareIds.has(shareId)) return null;
    shareByCharacter.set(player.id, shareId);
    shareIds.add(shareId);
  }

  const assigned = new Set<number>();
  const share: LootShare = {};

  for (const loot of loots) {
    if (loot.own === undefined || assigned.has(loot.own)) return null;
    const shareId = shareByCharacter.get(loot.own);

    if (shareId === undefined) return null;
    assigned.add(loot.own);
    share[shareId] = [loot.hid];
  }

  return assigned.size === players.length ? share : null;
}

export function inferInitialAllocation(
  repository: Pick<
    LootSubmissionAcceptancePersistence,
    "hasAmbiguousNpcVariant"
  >,
  submission: CreateLootRequest,
  primaryNpc: CreateLootRequest["npcs"][number],
  primaryNpcType: NpcType,
) {
  if (primaryNpcType !== NpcType.COLOSSUS) {
    return Effect.succeed({
      share: {},
      source: LootShareSource.NONE,
    });
  }

  return repository.hasAmbiguousNpcVariant(primaryNpc.name).pipe(
    Effect.map((ambiguous) => {
      if (ambiguous) {
        return {
          share: {},
          source: LootShareSource.NONE,
        };
      }

      const share = mapItemOwnerAllocation(
        submission.loots,
        submission.players,
      );

      return share
        ? { share, source: LootShareSource.ITEM_OWNER }
        : {
            share: {},
            source: LootShareSource.NONE,
          };
    }),
  );
}
