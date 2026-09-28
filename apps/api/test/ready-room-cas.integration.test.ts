import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import { MessagingError } from "@lootlog/messaging";
import { Effect, ManagedRuntime, Schema } from "effect";
import { Redis } from "effect/unstable/persistence";
import { RedisService, makeJsonCodec } from "#src/redis/redis.service";
import {
  makeReadyRoomRepository,
  type ReadyRoomRedis,
} from "#src/http-api/handlers/party-ready-room/ready-room.repository";
import {
  makeReadyRoomPublicationOutbox,
  READY_ROOM_PUBLICATION_KEYS,
} from "#src/messaging/ready-room/ready-room-publication-outbox";
import {
  PartyGatheringUpdateEnvelopeSchema,
  type PartyGatheringUpdateEnvelope,
} from "@lootlog/schema/party-ready-room";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import { makeGatheringUpdatePublisher } from "#src/runtime/features/ready-room";

describe("Ready Room revision CAS integration", () => {
  let runtime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;
  let redis: RedisService;
  const keysForCleanup = new Set<string>();

  const makeHarness = (clock: () => number = Date.now) => {
    const namespace = crypto.randomUUID();

    const publicationKeys = new Map<string, string>(
      READY_ROOM_PUBLICATION_KEYS.map((key) => [
        key,
        `${key}:integration:${namespace}`,
      ]),
    );

    const readyRedis: ReadyRoomRedis = {
      getJson: (key, schema) =>
        Effect.tryPromise(() => redis.getJson(key, makeJsonCodec(schema))),
      eval: (script, keys, args) => {
        const isolatedKeys = keys.map((key) => publicationKeys.get(key) ?? key);

        for (const key of isolatedKeys) keysForCleanup.add(key);

        return Effect.tryPromise(() =>
          redis.eval(script, isolatedKeys, [...args]),
        );
      },
    };

    return {
      repository: makeReadyRoomRepository(readyRedis, clock),
      outbox: (
        publish: (
          envelope: PartyGatheringUpdateEnvelope,
        ) => Effect.Effect<void, unknown>,
      ) => makeReadyRoomPublicationOutbox(readyRedis, publish, clock),
    };
  };

  const createAggregate = (now = Date.now()): ReadyRoomAggregate => {
    const id = crypto.randomUUID();
    const timestamp = new Date(now).toISOString();

    return {
      schemaVersion: 3,
      notificationId: id,
      organizerDiscordId: id,
      organizerCharacter: {
        accountId: id,
        characterId: id,
        nick: "Organizer",
        lvl: 200,
        prof: "w",
        icon: "hero.gif",
      },
      guildIds: [id],
      world: "Test",
      status: "ACTIVE",
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: new Date(now + 60_000).toISOString(),
      participants: {},
    };
  };

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
  });
  afterAll(async () => {
    await Promise.all([...keysForCleanup].map((key) => redis.del(key)));
    await runtime.dispose();
  });

  it("dispatches a committed creation after the accepting API process is replaced", async () => {
    const { repository, outbox } = makeHarness();
    const aggregate = createAggregate();
    expect((await Effect.runPromise(repository.create(aggregate))).status).toBe(
      "created",
    );

    const published: PartyGatheringUpdateEnvelope[] = [];

    const replacement = outbox((envelope) =>
      Effect.sync(() => {
        published.push(envelope);
      }),
    );

    await Effect.runPromise(replacement.dispatch);

    expect(published).toMatchObject([
      {
        notificationId: aggregate.notificationId,
        revision: 1,
        update: { type: "UPSERT" },
      },
    ]);
    await Effect.runPromise(replacement.dispatch);
    expect(published).toHaveLength(1);
  });

  it("retries every Organization after partial Rabbit delivery and an API restart", async () => {
    let now = Date.now();
    const { repository, outbox } = makeHarness(() => now);
    const aggregate = createAggregate(now);
    aggregate.guildIds.push(`${aggregate.notificationId}-other`);
    const delivered: PartyGatheringUpdateEnvelope[] = [];

    const initial = outbox((envelope) =>
      envelope.guildId === aggregate.guildIds[1]
        ? Effect.fail(new Error("Rabbit unavailable"))
        : Effect.sync(() => {
            delivered.push(envelope);
          }),
    );

    expect((await Effect.runPromise(repository.create(aggregate))).status).toBe(
      "created",
    );
    await Effect.runPromise(initial.dispatch);
    expect(delivered.map(({ guildId }) => guildId)).toEqual([
      aggregate.guildIds[0],
    ]);

    const replacement = outbox((envelope) =>
      Effect.sync(() => {
        delivered.push(envelope);
      }),
    );

    await Effect.runPromise(replacement.dispatch);
    expect(delivered).toHaveLength(1);

    now += 30_001;
    await Effect.runPromise(replacement.dispatch);
    expect(delivered.map(({ guildId }) => guildId)).toEqual([
      aggregate.guildIds[0],
      aggregate.guildIds[0],
      aggregate.guildIds[1],
    ]);

    for (const envelope of delivered) {
      expect(envelope.update).toMatchObject({
        type: "UPSERT",
        gathering: { guildIds: [envelope.guildId] },
      });
    }

    await Effect.runPromise(replacement.dispatch);
    expect(delivered).toHaveLength(3);
  });

  it("preserves a newer committed revision when an older publication is acknowledged", async () => {
    const { repository, outbox } = makeHarness();
    const aggregate = createAggregate();

    const next: ReadyRoomAggregate = {
      ...aggregate,
      revision: 2,
      description: "New description",
    };

    const delivered: PartyGatheringUpdateEnvelope[] = [];

    expect((await Effect.runPromise(repository.create(aggregate))).status).toBe(
      "created",
    );

    const earlierPublication = outbox((envelope) =>
      Effect.gen(function* () {
        delivered.push(envelope);
        expect((yield* repository.commit(aggregate, next)).status).toBe(
          "committed",
        );
      }),
    );

    await Effect.runPromise(earlierPublication.publish(aggregate));

    const replacement = outbox((envelope) =>
      Effect.sync(() => {
        delivered.push(envelope);
      }),
    );

    await Effect.runPromise(replacement.dispatch);
    expect(delivered.map(({ revision }) => revision)).toEqual([1, 2]);
    expect(delivered[1]?.update).toMatchObject({
      type: "UPSERT",
      gathering: { description: "New description" },
    });
    await Effect.runPromise(replacement.dispatch);
    expect(delivered).toHaveLength(2);
  });

  it("delivers cancellation after the terminal room tombstone disappears", async () => {
    const { repository, outbox } = makeHarness();
    const aggregate = createAggregate();

    const terminal: ReadyRoomAggregate = {
      ...aggregate,
      revision: 2,
      status: "CANCELLED",
    };

    const delivered: PartyGatheringUpdateEnvelope[] = [];

    expect((await Effect.runPromise(repository.create(aggregate))).status).toBe(
      "created",
    );
    expect(
      (await Effect.runPromise(repository.terminate(aggregate, terminal)))
        .status,
    ).toBe("committed");
    await redis.del(`party-ready-room:v3:room:${aggregate.notificationId}`);
    expect(
      await Effect.runPromise(repository.get(aggregate.notificationId)),
    ).toBeNull();

    await Effect.runPromise(
      outbox((envelope) =>
        Effect.sync(() => {
          delivered.push(envelope);
        }),
      ).dispatch,
    );
    expect(delivered).toMatchObject([
      {
        notificationId: aggregate.notificationId,
        revision: 2,
        update: { type: "REMOVE", revision: 2 },
      },
    ]);
  });

  it("uses a distinct expiry removal identity after partially delivered active snapshots", async () => {
    let now = Date.now();
    const { repository, outbox } = makeHarness(() => now);
    const aggregate = createAggregate(now);
    aggregate.guildIds.push(`${aggregate.notificationId}-other`);
    let secondOrganizationAvailable = false;

    const delivered: Array<{
      messageId: string | undefined;
      envelope: PartyGatheringUpdateEnvelope;
    }> = [];

    const publisher = makeGatheringUpdatePublisher({
      publish: (message) =>
        Effect.gen(function* () {
          const envelope = Schema.decodeUnknownSync(
            Schema.fromJsonString(PartyGatheringUpdateEnvelopeSchema),
          )(new TextDecoder().decode(message.content));

          if (
            envelope.guildId === aggregate.guildIds[1] &&
            !secondOrganizationAvailable
          ) {
            return yield* new MessagingError({
              operation: "publish",
              message: "Rabbit unavailable",
              cause: new Error("Rabbit unavailable"),
            });
          }

          delivered.push({ messageId: message.messageId, envelope });
        }),
    });

    const publications = outbox(publisher);

    expect((await Effect.runPromise(repository.create(aggregate))).status).toBe(
      "created",
    );
    await Effect.runPromise(publications.dispatch);
    now += 30_001;
    await Effect.runPromise(publications.dispatch);

    secondOrganizationAvailable = true;
    now += 30_001;
    await Effect.runPromise(publications.dispatch);
    expect(delivered.map(({ envelope }) => envelope.update.type)).toEqual([
      "UPSERT",
      "UPSERT",
      "REMOVE",
      "REMOVE",
    ]);
    expect(delivered[0]?.messageId).toBeDefined();
    expect(delivered[1]?.messageId).toBe(delivered[0]?.messageId);
    expect(delivered[2]?.messageId).toBeDefined();
    expect(delivered[2]?.messageId).not.toBe(delivered[0]?.messageId);
    expect(delivered.slice(2).map(({ envelope }) => envelope)).toMatchObject(
      aggregate.guildIds.map((guildId) => ({
        guildId,
        notificationId: aggregate.notificationId,
        revision: 1,
        update: { type: "REMOVE", revision: 1 },
      })),
    );
    await Effect.runPromise(publications.dispatch);
    expect(delivered).toHaveLength(4);
  });

  for (const operation of [
    "commit",
    "join",
    "exitParticipant",
    "terminate",
  ] as const) {
    it(`${operation} accepts decoded current state and rejects stale revisions`, async () => {
      const { repository, outbox } = makeHarness();
      const published: PartyGatheringUpdateEnvelope[] = [];

      const publications = outbox((envelope) =>
        Effect.sync(() => {
          published.push(envelope);
        }),
      );

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
        partyMemberCount: 2,
        partyState: {
          status: "OBSERVED",
          observedAt: timestamp,
          members: [
            {
              characterId: id,
              nick: "Organizer",
              lvl: 200,
              prof: "w",
              icon: "hero.gif",
            },
            { characterId: `${id}-guest`, nick: "Guest" },
          ],
        },
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
      await Effect.runPromise(publications.dispatch);
      expect(published).toMatchObject([
        { notificationId: id, revision: 1, update: { type: "UPSERT" } },
      ]);
      published.length = 0;
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
      await Effect.runPromise(publications.dispatch);
      expect(published).toMatchObject([
        {
          notificationId: id,
          revision: 2,
          update: { type: operation === "terminate" ? "REMOVE" : "UPSERT" },
        },
      ]);
      await Effect.runPromise(publications.dispatch);
      expect(published).toHaveLength(1);

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
