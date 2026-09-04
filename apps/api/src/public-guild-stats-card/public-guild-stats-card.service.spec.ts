import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Effect } from "effect";
import { HttpClient } from "effect/unstable/http";
import {
  PublicGuildStatsCardPersistenceError,
  type PublicGuildStatsCardRepositoryService,
} from "./public-guild-stats-card.repository.js";
import {
  makePublicGuildStatsCard,
  type PublicGuildStatsCard,
  type PublicGuildStatsCardCache,
  PublicGuildStatsCardImageAdapter,
} from "./public-guild-stats-card.service.js";

const makeRepository = () => ({
  findActiveGuild: mock<
    PublicGuildStatsCardRepositoryService["findActiveGuild"]
  >(() => Effect.succeed(null)),
  getLootStats: mock<PublicGuildStatsCardRepositoryService["getLootStats"]>(
    () => Effect.die("Stats not configured"),
  ),
});
const makeCache = () => ({
  get: mock<PublicGuildStatsCardCache["get"]>(() => Effect.succeed(null)),
  set: mock<PublicGuildStatsCardCache["set"]>(() => Effect.void),
  setNX: mock<PublicGuildStatsCardCache["setNX"]>(() => Effect.succeed(true)),
  del: mock<PublicGuildStatsCardCache["del"]>(() => Effect.void),
});

describe("public guild stats card Effect module", () => {
  const unavailableHttpClient = HttpClient.make(() =>
    Effect.die("HTTP must not run without a guild icon"),
  );
  let service: PublicGuildStatsCard;
  let repository: ReturnType<typeof makeRepository>;
  let redis: ReturnType<typeof makeCache>;
  const createService = (environment: RuntimeEnvironment) =>
    makePublicGuildStatsCard({
      repository,
      cache: redis,
      environment,
      image: new PublicGuildStatsCardImageAdapter(unavailableHttpClient),
    });
  beforeEach(() => {
    repository = makeRepository();
    redis = makeCache();
    service = createService(RuntimeEnvironment.PROD);
  });

  it("returns cached png for enabled guild without querying stats", async () => {
    const cachedImage = Buffer.from("cached-png");
    redis.get.mockReturnValue(Effect.succeed(cachedImage.toString("base64")));
    repository.findActiveGuild.mockReturnValue(
      Effect.succeed({
        id: "guild-1",
        name: "Guild One",
        icon: null,
        publicStatsCardEnabled: true,
      }),
    );

    const result = await Effect.runPromise(service.getStatsCard("guild-1"));

    expect(result).toEqual(cachedImage);
    expect(repository.findActiveGuild).toHaveBeenCalledTimes(1);
    expect(repository.getLootStats).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("throws not found for missing or inactive guild", async () => {
    redis.get.mockReturnValue(Effect.succeed(null));
    repository.findActiveGuild.mockReturnValue(Effect.succeed(null));

    await expect(
      Effect.runPromise(service.getStatsCard("guild-1")),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(repository.findActiveGuild).toHaveBeenCalledWith("guild-1");
  });

  it("throws not found and skips cache for disabled guild", async () => {
    redis.get.mockReturnValue(
      Effect.succeed(Buffer.from("cached-png").toString("base64")),
    );
    repository.findActiveGuild.mockReturnValue(
      Effect.succeed({
        id: "guild-1",
        name: "Guild One",
        icon: null,
        publicStatsCardEnabled: false,
      }),
    );

    await expect(
      Effect.runPromise(service.getStatsCard("guild-1")),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(redis.get).not.toHaveBeenCalled();
    expect(repository.getLootStats).not.toHaveBeenCalled();
  });

  it("renders and caches a png with zero stats", async () => {
    redis.get.mockReturnValue(Effect.succeed(null));
    repository.findActiveGuild.mockReturnValue(
      Effect.succeed({
        id: "guild-1",
        name: "Guild <One>",
        icon: null,
        publicStatsCardEnabled: true,
      }),
    );
    repository.getLootStats.mockReturnValue(
      Effect.succeed({
        totalLoots: 0,
        legendaryItems: 0,
        heroicItems: 0,
      }),
    );

    const result = await Effect.runPromise(service.getStatsCard("guild-1"));

    expect(result.subarray(1, 4).toString()).toBe("PNG");
    expect(redis.set).toHaveBeenCalledWith(
      "guild-stats-card:guild-1:v2",
      result.toString("base64"),
      86_400,
    );
  });

  it("bypasses cache in local environment", async () => {
    service = createService(RuntimeEnvironment.LOCAL);
    redis.get.mockReturnValue(
      Effect.succeed(Buffer.from("cached-png").toString("base64")),
    );
    repository.findActiveGuild.mockReturnValue(
      Effect.succeed({
        id: "guild-1",
        name: "Guild One",
        icon: null,
        publicStatsCardEnabled: true,
      }),
    );
    repository.getLootStats.mockReturnValue(
      Effect.succeed({
        totalLoots: 7,
        legendaryItems: 1,
        heroicItems: 2,
      }),
    );

    const result = await Effect.runPromise(service.getStatsCard("guild-1"));

    expect(result.subarray(1, 4).toString()).toBe("PNG");
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(repository.findActiveGuild).toHaveBeenCalledTimes(1);
  });

  it("uses last 30 days aggregation values", async () => {
    redis.get.mockReturnValue(Effect.succeed(null));
    repository.findActiveGuild.mockReturnValue(
      Effect.succeed({
        id: "guild-1",
        name: "Guild One",
        icon: null,
        publicStatsCardEnabled: true,
      }),
    );
    repository.getLootStats.mockReturnValue(
      Effect.succeed({
        totalLoots: 42,
        legendaryItems: 3,
        heroicItems: 12,
      }),
    );

    await Effect.runPromise(service.getStatsCard("guild-1"));

    expect(repository.getLootStats).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      "guild-stats-card:guild-1:v2",
      expect.any(String),
      86_400,
    );
  });

  it("refreshes and caches a png when cooldown is available", async () => {
    redis.setNX.mockReturnValue(Effect.succeed(true));
    repository.findActiveGuild.mockReturnValue(
      Effect.succeed({
        id: "guild-1",
        name: "Guild One",
        icon: null,
        publicStatsCardEnabled: true,
      }),
    );
    repository.getLootStats.mockReturnValue(
      Effect.succeed({
        totalLoots: 42,
        legendaryItems: 3,
        heroicItems: 12,
      }),
    );

    const result = await Effect.runPromise(service.refreshStatsCard("guild-1"));

    expect(result.nextRefreshAt).toEqual(expect.any(String));
    expect(redis.setNX).toHaveBeenCalledWith(
      "guild-stats-card-refresh:guild-1",
      expect.any(String),
      300,
    );
    expect(redis.set).toHaveBeenCalledWith(
      "guild-stats-card:guild-1:v2",
      expect.any(String),
      86_400,
    );
  });

  it("rate limits refreshes for five minutes", async () => {
    redis.setNX.mockReturnValue(Effect.succeed(false));
    redis.get.mockReturnValue(Effect.succeed("2026-05-03T23:05:00.000Z"));
    repository.findActiveGuild.mockReturnValue(
      Effect.succeed({
        id: "guild-1",
        name: "Guild One",
        icon: null,
        publicStatsCardEnabled: true,
      }),
    );

    await expect(
      Effect.runPromise(service.refreshStatsCard("guild-1")),
    ).rejects.toMatchObject({
      kind: "rate-limited",
      response: {
        nextRefreshAt: "2026-05-03T23:05:00.000Z",
      },
    });

    expect(redis.set).not.toHaveBeenCalled();
    expect(repository.getLootStats).not.toHaveBeenCalled();
  });

  it("releases refresh cooldown when regeneration fails", async () => {
    const error = new PublicGuildStatsCardPersistenceError({
      cause: new Error("stats unavailable"),
    });
    redis.setNX.mockReturnValue(Effect.succeed(true));
    repository.findActiveGuild.mockReturnValue(
      Effect.succeed({
        id: "guild-1",
        name: "Guild One",
        icon: null,
        publicStatsCardEnabled: true,
      }),
    );
    repository.getLootStats.mockReturnValue(Effect.fail(error));

    await expect(
      Effect.runPromise(service.refreshStatsCard("guild-1")),
    ).rejects.toBe(error);

    expect(redis.del).toHaveBeenCalledWith("guild-stats-card-refresh:guild-1");
    expect(redis.set).not.toHaveBeenCalled();
  });
});
