import { afterAll, beforeAll, expect, it } from "bun:test";
import { Client } from "pg";
import { Effect, Layer, ManagedRuntime, Schema } from "effect";
import { ApiDatabaseLive } from "#src/database/drizzle/database";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { makeSettingsDocuments } from "#src/settings-documents/settings-documents.service";
import { makeSoundSettings } from "#src/sound-settings/sound-settings.service";
import { makeTimerSettings } from "#src/timer-settings/timer-settings.service";
import { requireIsolatedTestDatabase } from "./isolated-test-database.js";

const client = new Client({ connectionString: requireIsolatedTestDatabase() });

const runtime = ManagedRuntime.make(
  SettingsDocumentsRepository.layerDatabase.pipe(
    Layer.provide(ApiDatabaseLive),
  ),
);

beforeAll(async () => {
  await client.connect();
  // Pause real writes until both transactions have taken their read snapshots.
  await client.query(`CREATE FUNCTION pause_settings_write() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF current_setting('transaction_isolation') <> 'serializable' THEN
        RAISE EXCEPTION 'settings writes must be serializable';
      END IF;
      PERFORM pg_advisory_xact_lock(783219);
      RETURN NEW;
    END $$`);
  await client.query(`CREATE TRIGGER pause_settings_write BEFORE INSERT OR UPDATE ON "UserSettingDocument"
    FOR EACH ROW EXECUTE FUNCTION pause_settings_write()`);
});

afterAll(async () => {
  await client.query(
    'DROP TRIGGER IF EXISTS pause_settings_write ON "UserSettingDocument"',
  );
  await client.query("DROP FUNCTION IF EXISTS pause_settings_write()");
  await client.end();
  await runtime.dispose();
});

/**
 * Waits until `count` writes are paused by the trigger (each request has done
 * every read it makes before writing), then lets them all continue.
 */
const releaseAfterBlockedWrites = async (count: number) => {
  let blocked = 0;

  try {
    const deadline = Date.now() + 5000;

    while (blocked < count && Date.now() < deadline) {
      const result =
        await client.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE datname = current_database() AND pid <> pg_backend_pid()
          AND wait_event_type = 'Lock' AND query LIKE '%UserSettingDocument%'`);

      blocked =
        Schema.decodeUnknownSync(
          Schema.Array(Schema.Struct({ count: Schema.Number })),
        )(result.rows)[0]?.count ?? 0;

      if (blocked < count) await Bun.sleep(10);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(783219)");
  }

  return blocked;
};

const makeServices = async () => {
  const documents = makeSettingsDocuments(
    await runtime.runPromise(SettingsDocumentsRepository),
  );

  return {
    documents,
    sound: makeSoundSettings(documents),
    timer: makeTimerSettings(documents),
  };
};

it.each([false, true])(
  "preserves both concurrent patches when the settings document exists: %s",
  async (existing) => {
    const repository = await runtime.runPromise(SettingsDocumentsRepository);
    const userId = crypto.randomUUID();
    const scope = { type: "USER", id: userId } as const;

    if (existing) {
      await runtime.runPromise(
        repository.applyOperations(userId, [
          {
            domain: "general",
            scope,
            set: { activityFeed: { excludedGuildIds: ["original"] } },
            unset: [],
          },
        ]),
      );
    }

    await client.query("SELECT pg_advisory_lock(783219)");

    const patches = [
      runtime.runPromise(
        repository.applyOperations(userId, [
          {
            domain: "general",
            scope,
            set: { allowWorldSelection: true },
            unset: [],
          },
        ]),
      ),
      runtime.runPromise(
        repository.applyOperations(userId, [
          {
            domain: "general",
            scope,
            set: { activityFeed: { excludedGuildIds: ["first", "second"] } },
            unset: [],
          },
        ]),
      ),
    ];

    const blocked = await releaseAfterBlockedWrites(2);

    await Promise.all(patches);
    expect(blocked).toBe(2);

    const documents = await runtime.runPromise(
      repository.findDocuments(userId, ["general"], [scope]),
    );

    expect(documents).toHaveLength(1);
    expect(documents[0]?.overrides).toEqual({
      allowWorldSelection: true,
      activityFeed: { excludedGuildIds: ["first", "second"] },
    });
  },
);

it("applies a batch mixing stored, outdated, emptied, repeated and new documents", async () => {
  const repository = await runtime.runPromise(SettingsDocumentsRepository);
  const userId = crypto.randomUUID();
  const scope = { type: "USER", id: userId } as const;

  // The write trigger above requires serializable transactions.
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  await client.query(
    `INSERT INTO "UserSettingDocument" ("userId", "domain", "scopeType", "scopeId", "overrides", "schemaVersion", "updatedAt")
      VALUES ($1, 'general', 'USER', $1, '{"allowWorldSelection":false}', 1, now()),
        ($1, 'appearance', 'USER', $1, '{"colorMode":"legacy","theme":"dark"}', 2, now()),
        ($1, 'sounds', 'USER', $1, '{"pingsVolume":0.5}', 1, now())`,
    [userId],
  );
  await client.query("COMMIT");

  await runtime.runPromise(
    repository.applyOperations(userId, [
      {
        domain: "appearance",
        scope,
        set: { chat: { fontScalePercent: 110 } },
        unset: [],
      },
      {
        domain: "general",
        scope,
        set: { allowWorldSelection: true },
        unset: [],
      },
      {
        domain: "general",
        scope,
        set: { activityFeed: { paused: true } },
        unset: [],
      },
      { domain: "sounds", scope, set: {}, unset: ["pingsVolume"] },
      {
        domain: "timers",
        scope,
        set: { timerFiltersEnabled: false },
        unset: [],
      },
    ]),
  );

  const documents = await runtime.runPromise(
    repository.findDocuments(
      userId,
      ["appearance", "general", "sounds", "timers"],
      [scope],
    ),
  );

  expect(
    Object.fromEntries(
      documents.map((document) => [
        document.domain,
        {
          overrides: document.overrides,
          schemaVersion: document.schemaVersion,
        },
      ]),
    ),
  ).toEqual({
    appearance: {
      overrides: { theme: "dark", chat: { fontScalePercent: 110 } },
      schemaVersion: 3,
    },
    general: {
      overrides: { allowWorldSelection: true, activityFeed: { paused: true } },
      schemaVersion: 1,
    },
    timers: { overrides: { timerFiltersEnabled: false }, schemaVersion: 1 },
  });
});

it("keeps both of two concurrent sound patches to one category", async () => {
  const { sound } = await makeServices();
  const userId = crypto.randomUUID();

  await client.query("SELECT pg_advisory_lock(783219)");

  // The compatibility route used to read the whole category, merge its patch
  // and write the map back, so the later write restored the other sound.
  const patches = [
    runtime.runPromise(
      sound.updateSettings(userId, {
        notificationsConfig: { HERO: { volume: 0.2 } },
      }),
    ),
    runtime.runPromise(
      sound.updateSettings(userId, {
        notificationsConfig: { TITAN: { volume: 0.9 } },
      }),
    ),
  ];

  const blocked = await releaseAfterBlockedWrites(2);
  await Promise.all(patches);
  expect(blocked).toBe(2);

  await expect(
    runtime.runPromise(sound.getSettings(userId)),
  ).resolves.toMatchObject({
    notificationsConfig: {
      HERO: { volume: 0.2, soundUrl: "" },
      TITAN: { volume: 0.9, soundUrl: "" },
    },
  });
});

it("rejects a settings patch based on a stale read", async () => {
  const { documents } = await makeServices();
  const userId = crypto.randomUUID();
  const scope = { type: "USER", id: userId } as const;

  const patch = (
    set: Record<string, boolean>,
    expectedUpdatedAt: Date | null,
  ) =>
    runtime.runPromise(
      documents
        .patchPreferences(userId, {
          operations: [
            { domain: "general", scope, set, unset: [], expectedUpdatedAt },
          ],
        })
        .pipe(
          Effect.map(({ domains }) => domains.general?.updatedAt),
          Effect.catchTag("SettingsRequestError", (error) =>
            Effect.succeed(error.status),
          ),
        ),
    );

  const firstWrite = await patch({ allowWorldSelection: true }, null);
  expect(firstWrite).toBeInstanceOf(Date);

  // Another client created the document after this one read it as missing.
  await expect(patch({ allowWorldSelection: false }, null)).resolves.toBe(409);

  if (!(firstWrite instanceof Date)) throw new Error("No updatedAt");

  const secondWrite = await patch({ allowWorldSelection: false }, firstWrite);
  expect(secondWrite).toBeInstanceOf(Date);

  // The first read is stale once the second write has landed, even when both
  // writes fall in the same millisecond.
  await expect(patch({ allowWorldSelection: true }, firstWrite)).resolves.toBe(
    409,
  );

  const stored = await runtime.runPromise(
    documents.getPreferences(userId, { domains: ["general"] }),
  );

  expect(stored.domains.general?.effective.allowWorldSelection).toBe(false);
});

it("imports local timer settings atomically without inventing a sort order", async () => {
  const { documents, timer } = await makeServices();
  const userId = crypto.randomUUID();

  // The user is not a member of this guild, so the whole import is refused
  // before the global settings would be written.
  await expect(
    runtime.runPromise(
      timer.migrateSettings(userId, {
        localData: {
          generalConfig: { timersGrouping: true },
          hiddenTimers: { "foreign-guild": ["timer-1"] },
        },
      }),
    ),
  ).rejects.toThrow("Guild settings are not accessible");

  const afterRefusal = await runtime.runPromise(
    documents.getPreferences(userId, { domains: ["appearance", "timers"] }),
  );

  expect(afterRefusal.domains.timers?.layers).toEqual([]);
  expect(afterRefusal.domains.appearance?.layers).toEqual([]);

  await runtime.runPromise(
    timer.migrateSettings(userId, {
      localData: { generalConfig: { timersGrouping: true } },
    }),
  );

  await expect(
    runtime.runPromise(timer.getGlobalSettings(userId)),
  ).resolves.toMatchObject({
    generalConfig: { timersGrouping: true },
    timersSortOrder: "asc",
  });
});
