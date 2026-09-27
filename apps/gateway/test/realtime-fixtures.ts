import { Permission } from "@lootlog/schema/permissions";
import type { RealtimeHub } from "../src/realtime/realtime-hub.js";
import type { GatewaySocket, SessionData } from "../src/realtime/session.js";

const unexpectedFederationIO = () =>
  Promise.reject(new Error("Unexpected federation I/O"));

export const unusedFederationStore = {
  publish: unexpectedFederationIO,
  subscribe: unexpectedFederationIO,
} satisfies ConstructorParameters<typeof RealtimeHub>[1];

/** A joined game socket on classic map 7 that may share pings in one Organization. */
export const makeGamePingSocket = (): GatewaySocket => ({
  send: () => 0,
  close: () => {},
  getBufferedAmount: () => 0,
  data: {
    discordId: "discord-1",
    userId: "user-1",
    connectionId: "connection-1",
    platform: "game",
    joined: true,
    guilds: [
      {
        guild: { id: "organization-1", ownerId: "another-user" },
        roles: [
          {
            id: "role-1",
            lvlRangeFrom: 0,
            lvlRangeTo: 500,
            permissions: [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
          },
        ],
      },
    ],
    subscriptions: new Map(),
    airTagScopes: [],
    confidence: "verified",
    presence: {
      userId: "user-1",
      sessionId: "presence-1",
      organizationIds: ["organization-1"],
      platform: "game",
      status: "online",
      confidence: "verified",
      isAfk: false,
      lastSeen: 1,
      character: {
        world: "classic",
        name: "Hero",
        lvl: 100,
        icon: "icon",
        characterId: "123",
        accountId: "456",
        prof: "w",
      },
      location: { mapId: 7, map: "Map", x: 1, y: 2 },
    },
  } satisfies SessionData,
});
