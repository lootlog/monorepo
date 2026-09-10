import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import { Effect, ManagedRuntime } from "effect";
import { Redis } from "effect/unstable/persistence";
import { RedisService, makeJsonCodec } from "#src/redis/redis.service";
import {
  makeReadyRoomRepository,
  type ReadyRoomEffectRepository,
} from "#src/http-api/handlers/party-ready-room/ready-room.repository";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";

describe("Ready Room revision CAS integration", () => {
  let runtime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;
  let repository: ReadyRoomEffectRepository;
  let redis: RedisService;

  beforeAll(async () => {
    runtime = ManagedRuntime.make(
      BunRedis.layer({
        url: `redis://${encodeURIComponent(process.env.REDIS_USERNAME ?? "")}:${encodeURIComponent(process.env.REDIS_PASSWORD ?? "")}@${process.env.REDIS_HOST ?? "127.0.0.1"}:${process.env.REDIS_PORT ?? "6379"}`,
      }),
    );
    redis = new RedisService(
      await runtime.runPromise(Redis.Redis),
      {},
      (effect) => runtime.runPromise(effect),
    );
    repository = makeReadyRoomRepository({
      getJson: (key, schema) =>
        Effect.tryPromise(() => redis.getJson(key, makeJsonCodec(schema))),
      eval: <A>(
        script: string,
        keys: ReadonlyArray<string>,
        args: ReadonlyArray<string | number>,
      ) => Effect.tryPromise(() => redis.eval<A>(script, [...keys], [...args])),
    });
  });
  afterAll(async () => {
    await runtime.dispose();
  });

  for (const operation of [
    "commit",
    "join",
    "exitParticipant",
    "terminate",
  ] as const) {
    it(`${operation} accepts decoded current state and rejects stale revisions`, async () => {
      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const character = {
        lvl: 200,
        nick: "Organizer",
        accountId: id,
        characterId: id,
        prof: "w",
        icon: "hero.gif",
      };
      const original: ReadyRoomAggregate = {
        schemaVersion: 3,
        notificationId: id,
        organizerDiscordId: id,
        organizerCharacter: character,
        guildIds: [id],
        world: "Test",
        status: "ACTIVE",
        revision: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        participants: {
          participant: {
            participantId: "participant",
            discordId: `${id}-participant`,
            character: { ...character, characterId: `${id}-participant` },
            partyPresence: "OUTSIDE",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        },
      };
      expect(
        (await Effect.runPromise(repository.create(original))).status,
      ).toBe("created");
      expect(
        await Effect.runPromise(repository.findActive([id], "Other")),
      ).toEqual([]);
      expect(
        await Effect.runPromise(repository.findActive([`${id}-other`], "Test")),
      ).toEqual([]);
      expect(
        await Effect.runPromise(repository.findActive([id, id], "Test")),
      ).toEqual([original]);
      expect(
        await Effect.runPromise(
          repository.create({
            ...original,
            notificationId: crypto.randomUUID(),
          }),
        ),
      ).toEqual({ status: "active-room-exists", notificationId: id });
      expect(
        await Effect.runPromise(
          repository.create({
            ...original,
            notificationId: crypto.randomUUID(),
            organizerDiscordId: crypto.randomUUID(),
          }),
        ),
      ).toEqual({ status: "joined-elsewhere", notificationId: id });
      const current = await Effect.runPromise(repository.get(id));
      if (!current) throw new Error("Created room missing");
      expect(current).toEqual(original);
      // The HTTP character schema and storage decoder use different field order.
      expect(JSON.stringify(current)).not.toBe(JSON.stringify(original));
      const next: ReadyRoomAggregate = {
        ...current,
        revision: 2,
        status: operation === "terminate" ? "CANCELLED" : "ACTIVE",
        participants:
          operation === "exitParticipant" ? {} : current.participants,
      };
      const mutate = () =>
        operation === "join" || operation === "exitParticipant"
          ? repository[operation](current, next, "participant")
          : repository[operation](current, next);
      expect((await Effect.runPromise(mutate())).status).toBe("committed");
      expect(await Effect.runPromise(repository.get(id))).toEqual(next);
      expect(
        await Effect.runPromise(repository.findActive([id], "Test")),
      ).toEqual(operation === "terminate" ? [] : [next]);
      expect((await Effect.runPromise(mutate())).status).toBe("conflict");
      expect(await Effect.runPromise(repository.get(id))).toEqual(next);
      if (operation === "join") {
        const otherId = crypto.randomUUID();
        const other = {
          ...original,
          notificationId: otherId,
          organizerDiscordId: otherId,
          organizerCharacter: { ...character, characterId: otherId },
        };
        expect((await Effect.runPromise(repository.create(other))).status).toBe(
          "created",
        );
        const joinOther = () =>
          repository.join(other, { ...other, revision: 2 }, "participant");
        expect(await Effect.runPromise(joinOther())).toEqual({
          status: "joined-elsewhere",
          notificationId: id,
        });
        // A stale index must be recovered without accessing undeclared keys.
        await redis.del(`party-ready-room:v3:room:${id}`);
        expect((await Effect.runPromise(joinOther())).status).toBe("committed");
      }
      await redis.del(`party-ready-room:v3:room:${id}`);
      expect(
        (await Effect.runPromise(repository.create(original))).status,
      ).toBe("created");
    });
  }
});
