import { API_KEY_LEASE_MS, ApiKeyStatus } from "@lootlog/schema/api-key-access";
import { Effect, Redacted, Schedule, Schema } from "effect";
import { HttpClientRequest, type HttpClient } from "effect/unstable/http";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import { hasValidApiKeyLease, type GatewaySocket } from "#src/realtime/session";

const StatusResponse = Schema.Struct({ keys: Schema.Array(ApiKeyStatus) });

export class ApiKeyLeases {
  constructor(
    private readonly config: Pick<
      GatewayConfiguration,
      "authUrl" | "apiKeyStatusSecret"
    >,
    private readonly client: HttpClient.HttpClient,
    private readonly sockets: () => ReadonlyArray<GatewaySocket>,
    private readonly refreshUser: (
      discordId: string,
      userId: string,
    ) => Effect.Effect<void, unknown>,
    private readonly now: () => number = Date.now,
  ) {}

  renew(): Effect.Effect<void> {
    const groups = new Map<string, GatewaySocket[]>();
    for (const socket of this.sockets()) {
      const access = socket.data.apiKeyAccess;
      if (!access) continue;
      if (!hasValidApiKeyLease(socket.data, this.now())) {
        socket.close(1008, "API key authorization expired");
        continue;
      }
      const group = groups.get(access.keyId) ?? [];
      group.push(socket);
      groups.set(access.keyId, group);
    }
    const keyIds = [...groups.keys()];
    if (!keyIds.length) return Effect.void;
    const { config, client, refreshUser, now } = this;
    const closeAll = () => {
      for (const sockets of groups.values())
        for (const socket of sockets) {
          socket.data.apiKeyLeaseExpiresAt = 0;
          socket.close(1008, "API key authorization unavailable");
        }
    };
    return Effect.gen(function* () {
      if (
        !config.authUrl ||
        !config.apiKeyStatusSecret ||
        !Redacted.value(config.apiKeyStatusSecret)
      ) {
        closeAll();
        return;
      }
      // Lease age starts before remote checks, so a slow renewal cannot extend stale authority.
      const checkedAt = now();
      const valid = new Map<string, Extract<ApiKeyStatus, { valid: true }>>();
      for (let offset = 0; offset < keyIds.length; offset += 100) {
        const request = HttpClientRequest.post(
          `${config.authUrl.replace(/\/$/, "")}/auth/internal/api-keys/status`,
          {
            headers: {
              Authorization: `Bearer ${Redacted.value(config.apiKeyStatusSecret)}`,
            },
          },
        ).pipe(
          HttpClientRequest.bodyJsonUnsafe({
            keyIds: keyIds.slice(offset, offset + 100),
          }),
        );
        const response = yield* client.execute(request);
        if (response.status !== 200) {
          closeAll();
          return;
        }
        const statuses = yield* Schema.decodeUnknownEffect(StatusResponse)(
          yield* response.json,
        );
        for (const status of statuses.keys)
          if (status.valid) valid.set(status.keyId, status);
      }
      const users = new Map<string, string>();
      for (const [keyId, sockets] of groups) {
        const status = valid.get(keyId);
        for (const socket of sockets) {
          if (
            !status ||
            status.access.keyId !== keyId ||
            status.userId !== socket.data.userId ||
            status.discordId !== socket.data.discordId
          ) {
            socket.data.apiKeyLeaseExpiresAt = 0;
            socket.close(1008, "API key revoked");
            continue;
          }
          socket.data.apiKeyAccess = status.access;
          users.set(status.userId, status.discordId);
        }
      }
      yield* Effect.forEach(
        users,
        ([userId, discordId]) => refreshUser(discordId, userId),
        { concurrency: 8, discard: true },
      );
      for (const [keyId, sockets] of groups) {
        if (!valid.has(keyId)) continue;
        for (const socket of sockets) {
          if (
            !hasValidApiKeyLease(socket.data, now()) ||
            now() >= checkedAt + API_KEY_LEASE_MS
          ) {
            socket.data.apiKeyLeaseExpiresAt = 0;
            socket.close(1008, "API key authorization expired");
            continue;
          }
          socket.data.apiKeyLeaseExpiresAt = checkedAt + API_KEY_LEASE_MS;
        }
      }
    }).pipe(
      Effect.timeout("15 seconds"),
      Effect.catchCause(() => Effect.sync(closeAll)),
    );
  }

  run(): Effect.Effect<void> {
    return Effect.suspend(() => this.renew()).pipe(
      Effect.repeat(Schedule.spaced("30 seconds")),
    );
  }
}
