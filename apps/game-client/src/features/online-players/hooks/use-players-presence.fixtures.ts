import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Capability } from "@lootlog/schema/permissions";
import type {
  PresenceWithLocation,
  ServerEvent,
} from "@lootlog/protocol/realtime";
import { renderHook } from "@testing-library/react";
import type { createOnlinePlayersTest } from "@/test/online-players-fixtures";
import { usePlayersPresence } from "./use-players-presence";

export const policy = (
  permissions: Capability[],
  organizationIds = ["guild-1"],
) =>
  createAccessPolicySnapshot(
    organizationIds.map((id) => ({
      guild: { id, ownerId: "owner" },
      roles: [{ permissions, lvlRangeFrom: 1, lvlRangeTo: 300 }],
    })),
    "user",
  );

export const fullPolicy = () =>
  policy([
    Capability.LOOTLOG_ONLINE_PLAYERS_READ,
    Capability.LOOTLOG_PRESENCE_LOCATION_READ,
  ]);

export const permissionEvent = (
  accessPolicy: ReturnType<typeof policy>,
): ServerEvent => ({
  v: 1,
  type: "permissions.updated",
  data: {
    changes: [],
    organizationIds: accessPolicy.organizations.map(
      (row) => row.organizationId,
    ),
    subscriptionScopes: [],
    accessPolicy,
  },
});

export const delta = (...presences: PresenceWithLocation[]): ServerEvent => ({
  v: 1,
  type: "presence.delta",
  data: {
    organizationId: "guild-1",
    revision: 2,
    changes: presences.map((presence) => ({ action: "upsert", presence })),
  },
});

export const mountPresence = async (
  harness: ReturnType<typeof createOnlinePlayersTest>,
  withPolicy = true,
) => {
  const result = renderHook(() => usePlayersPresence("guild-1", "alpha"), {
    wrapper: harness.wrapper,
  });

  harness.open();
  await harness.join(["guild-1"], withPolicy ? fullPolicy() : undefined);

  return result;
};
