import { afterAll, beforeAll, expect, it } from "bun:test";
import { Client } from "pg";
import { Layer, ManagedRuntime, Schema } from "effect";
import { ApiDatabaseLive } from "#src/database/drizzle/database";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
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
            set: { guildsOrder: ["original"] },
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
            set: { guildsOrder: ["first", "second"] },
            unset: [],
          },
        ]),
      ),
    ];

    let blocked = 0;

    try {
      const deadline = Date.now() + 5000;

      while (blocked < 2 && Date.now() < deadline) {
        const result =
          await client.query(`SELECT count(*)::int AS count FROM pg_stat_activity
          WHERE datname = current_database() AND pid <> pg_backend_pid()
            AND wait_event_type = 'Lock' AND query LIKE '%UserSettingDocument%'`);

        blocked =
          Schema.decodeUnknownSync(
            Schema.Array(Schema.Struct({ count: Schema.Number })),
          )(result.rows)[0]?.count ?? 0;

        if (blocked < 2) await Bun.sleep(10);
      }
    } finally {
      await client.query("SELECT pg_advisory_unlock(783219)");
    }

    await Promise.all(patches);
    expect(blocked).toBe(2);

    const documents = await runtime.runPromise(
      repository.findDocuments(userId, ["general"], [scope]),
    );

    expect(documents).toHaveLength(1);
    expect(documents[0]?.overrides).toEqual({
      allowWorldSelection: true,
      guildsOrder: ["first", "second"],
    });
  },
);
