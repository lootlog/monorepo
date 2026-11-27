import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { Layer, ManagedRuntime, Redacted } from "effect";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import {
  AuthRedisStorage,
  createAuthRedisConnection,
} from "#src/auth/storage/auth-redis-storage";
import {
  createSingleFlightRefresh,
  type RefreshCoordination,
} from "./discord-token-refresh.js";

const rotatedTokens = (refreshToken: string) => ({
  accessToken: `access-after-${refreshToken}`,
  refreshToken: `rotated-${refreshToken}`,
  accessTokenExpiresAt: new Date("2026-11-28T10:00:00.000Z"),
  scopes: ["identify", "email", "guilds"],
});

describe("Discord token refresh across auth replicas", () => {
  let redis: StartedTestContainer;

  const runtimes: Array<
    ManagedRuntime.ManagedRuntime<AuthRedisStorage, never>
  > = [];

  const replicaCoordination = async () => {
    const runtime = ManagedRuntime.make(
      AuthRedisStorage.layer.pipe(
        Layer.provide(
          createAuthRedisConnection(
            Redacted.make(
              `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`,
            ),
          ),
        ),
      ),
    );

    runtimes.push(runtime);

    return (await runtime.runPromise(AuthRedisStorage)).refreshCoordination;
  };

  beforeAll(async () => {
    redis = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();
  }, 60_000);

  afterAll(async () => {
    await Promise.all(runtimes.map((runtime) => runtime.dispose()));
    await redis?.stop();
  });

  it("spends a rotating refresh token once when two replicas refresh it together", async () => {
    const refreshToken = `refresh-${crypto.randomUUID()}`;
    const discordAnswer = Promise.withResolvers<void>();
    const discordCalled = Promise.withResolvers<void>();

    const discord = mock(async (token: string) => {
      discordCalled.resolve();
      await discordAnswer.promise;

      return rotatedTokens(token);
    });

    const [first, second] = await Promise.all([
      replicaCoordination(),
      replicaCoordination(),
    ]);

    const firstReplica = createSingleFlightRefresh(
      first,
      discord,
    )(refreshToken);

    await discordCalled.promise;

    const secondReplica = createSingleFlightRefresh(
      second,
      discord,
    )(refreshToken);

    discordAnswer.resolve();

    expect(await Promise.all([firstReplica, secondReplica])).toEqual([
      rotatedTokens(refreshToken),
      rotatedTokens(refreshToken),
    ]);
    expect(discord).toHaveBeenCalledTimes(1);
  });

  it("does not ask Discord again for a refresh token it already refused", async () => {
    const refreshToken = `refresh-${crypto.randomUUID()}`;

    const discord = mock(() =>
      Promise.reject(
        Object.assign(new Error("refused"), {
          status: 400,
          error: "invalid_grant",
        }),
      ),
    );

    const [first, second] = await Promise.all([
      replicaCoordination(),
      replicaCoordination(),
    ]);

    await expect(
      createSingleFlightRefresh(first, discord)(refreshToken),
    ).rejects.toMatchObject({ error: "invalid_grant" });
    await expect(
      createSingleFlightRefresh(second, discord)(refreshToken),
    ).rejects.toMatchObject({ status: 400, error: "invalid_grant" });
    expect(discord).toHaveBeenCalledTimes(1);
  });

  it("still refreshes through Discord while Redis is unavailable", async () => {
    const unavailable = () => Promise.reject(new Error("Redis is down"));

    const coordination: RefreshCoordination = {
      claim: unavailable,
      release: unavailable,
      read: unavailable,
      publish: unavailable,
    };

    const discord = mock((token: string) =>
      Promise.resolve(rotatedTokens(token)),
    );

    expect(
      await createSingleFlightRefresh(coordination, discord)("refresh-offline"),
    ).toEqual(rotatedTokens("refresh-offline"));
  });
});
