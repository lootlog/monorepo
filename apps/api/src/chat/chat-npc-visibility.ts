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
