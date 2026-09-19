import {
  canReadNpcFeatureSource,
  type RolePermissionData,
} from "@lootlog/domain/npc-permissions";
import {
  getNpcRoutingTier,
  isRoutableNpcSource,
} from "@lootlog/domain/npc-routing";
import type { NpcRoutingData } from "@lootlog/schema/npc-routing";

export type ChatNpcSource = NpcRoutingData & { readonly lvl: number };

/**
 * Chat-feature NPC visibility for the REST reads and for party ready-room
 * source visibility. The rule itself lives in `@lootlog/domain`, shared with
 * the realtime socket's `canReadFeatureEvent`; this only resolves the routing
 * tier from a stored NPC.
 *
 * Owner/ADMIN bypass and the party-gathering organizer bypass are applied by
 * the callers before this is asked.
 *
 * An NPC that cannot be classified into a routing tier is denied, matching the
 * realtime socket: falling back to the base tier would hand out an NPC-scoped
 * source that the socket suppresses.
 */
export const canReadChatNpcSource = (
  roles: ReadonlyArray<RolePermissionData>,
  npc: ChatNpcSource | null | undefined,
): boolean => {
  if (!npc) return canReadNpcFeatureSource(roles, "chat", null);

  if (!isRoutableNpcSource(npc)) return false;

  return canReadNpcFeatureSource(roles, "chat", {
    tier: getNpcRoutingTier(npc),
    npcLevel: npc.lvl,
  });
};
