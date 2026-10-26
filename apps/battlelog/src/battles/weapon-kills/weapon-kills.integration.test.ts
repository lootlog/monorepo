import { afterAll, beforeAll, beforeEach, expect, it } from "bun:test";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { generateKeyPairSync, sign } from "node:crypto";
import { makePostgresLayer } from "@lootlog/database";
import { makeMargonemProofVerifier } from "@lootlog/protocol/http/margonem-account-proof";
import { Effect, Redacted } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import pg from "pg";
import { makeBattleReadBudget } from "#src/database/battle-read-budget";
import { drizzleDatabaseEffect } from "#src/database/database";
import { PermissionDeniedError } from "#src/infrastructure/http-error";
import {
  makeWeaponKills,
  type RecordWeaponKillsInput,
} from "./weapon-kills.js";

let postgres: StartedPostgreSqlContainer;

let pool: pg.Pool;

beforeAll(async () => {
  postgres = await new PostgreSqlContainer(
    "timescale/timescaledb:2.24.0-pg17",
  ).start();
  pool = new pg.Pool({ connectionString: postgres.getConnectionUri() });

  const child = Bun.spawn(["bun", "src/database/migrate.ts"], {
    cwd: new URL("../../../", import.meta.url).pathname,
    env: {
      ...process.env,
      POSTGRESQL_CONNECTION_URI: postgres.getConnectionUri(),
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exit, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  if (exit !== 0) throw new Error(`Migration failed: ${stdout}\n${stderr}`);
}, 60_000);

afterAll(async () => {
  await pool?.end();
  await postgres?.stop();
});

beforeEach(async () => {
  await pool.query("TRUNCATE weapon_kills");
});

// Margonem signs account proofs; the test serves its own signing key.
const signingKey = generateKeyPairSync("rsa", { modulusLength: 2048 });

const signingKeyClient = HttpClient.make((request) =>
  Effect.succeed(
    HttpClientResponse.fromWeb(
      request,
      new Response(
        signingKey.publicKey.export({ type: "spki", format: "pem" }),
      ),
    ),
  ),
);

const proofFor = (
  battleKey: string,
  accountId: string,
  characterId: string,
) => {
  const characterHex = BigInt(characterId).toString(16).padStart(16, "0");
  const token = `lootlog:${battleKey}:${accountId}:02${characterHex}ffffffffffffffff${"a".repeat(32)}`;
  const ts = Date.now();
  const validatedString = `${accountId}+${token}+${ts}`;

  return {
    userId: accountId,
    characterId,
    token,
    ts,
    validatedString,
    signatureBase64: sign(
      "sha256",
      Buffer.from(validatedString),
      signingKey.privateKey,
    ).toString("base64"),
  };
};

const run = <A, E>(
  use: (weaponKills: ReturnType<typeof makeWeaponKills>) => Effect.Effect<A, E>,
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const drizzle = yield* drizzleDatabaseEffect;

      return yield* use(
        makeWeaponKills(
          drizzle,
          makeBattleReadBudget(drizzle),
          makeMargonemProofVerifier(
            { signingKeyUrl: "https://margonem.test/signing-key.pem" },
            signingKeyClient,
          ),
        ),
      );
    }).pipe(
      Effect.provide(
        makePostgresLayer({ url: Redacted.make(postgres.getConnectionUri()) }),
      ),
    ),
  );

const warrior = (originalId: number, team: number) => ({
  originalId,
  name: `Warrior${originalId}`,
  lvl: 100,
  prof: "w",
  icon: "",
  team,
});

const warriors = {
  "101": warrior(101, 1),
  "102": warrior(102, 1),
  "201": warrior(201, 2),
  "202": warrior(202, 2),
};

// 101 finishes 201, then 202 kills 101, who closes the battle; the others
// fight on and 102 finishes 202.
const firstRows = [
  "101=100;201=0;+dmg=900;-dmg=900",
  "202=100;101=0;+dmg=900;-dmg=900",
];

const lastRows = ["102=100;202=0;+dmg=900;-dmg=900"];

const submission = (
  characterId: string,
  weaponItemId: string,
  rows: string[],
  battleKey = "battle-1",
): RecordWeaponKillsInput => ({
  accountId: `9${characterId}`,
  characterId,
  world: "tempest",
  weaponItemId,
  battleKey,
  events: [{ f: { init: "1", w: warriors, m: rows } }],
  margonemAccountProof: proofFor(battleKey, `9${characterId}`, characterId),
});

it("counts each finishing blow once across a cut-short and a whole log", async () => {
  const cutShort = await run((weaponKills) =>
    weaponKills.recordWeaponKills(
      submission("101", "555", firstRows),
      "user-a",
    ),
  );

  const whole = await run((weaponKills) =>
    weaponKills.recordWeaponKills(
      submission("101", "555", [...firstRows, ...lastRows]),
      "user-a",
    ),
  );

  expect(cutShort).toEqual({ itemId: "555", kills: 1 });
  expect(whole).toEqual({ itemId: "555", kills: 1 });
});

it("credits only the submitter's finishing blows", async () => {
  const result = await run((weaponKills) =>
    weaponKills.recordWeaponKills(
      submission("102", "777", [...firstRows, ...lastRows]),
      "user-b",
    ),
  );

  expect(result).toEqual({ itemId: "777", kills: 1 });
});

it("starts a weapon from zero for its new owner", async () => {
  await run((weaponKills) =>
    weaponKills.recordWeaponKills(
      submission("101", "555", firstRows),
      "user-a",
    ),
  );

  // 101 gives the weapon to 102, who finishes 202 with it.
  const newOwner = await run((weaponKills) =>
    weaponKills.recordWeaponKills(
      submission("102", "555", [...firstRows, ...lastRows]),
      "user-b",
    ),
  );

  const previousOwner = await run((weaponKills) =>
    weaponKills.getCharacterWeaponKills({
      world: "tempest",
      characterId: "101",
    }),
  );

  expect(newOwner).toEqual({ itemId: "555", kills: 1 });
  expect(previousOwner).toEqual({ weapons: [{ itemId: "555", kills: 1 }] });
});

it("counts a repeated battle with the same rows again", async () => {
  await run((weaponKills) =>
    weaponKills.recordWeaponKills(
      submission("101", "555", firstRows, "battle-1"),
      "user-a",
    ),
  );

  const repeated = await run((weaponKills) =>
    weaponKills.recordWeaponKills(
      submission("101", "555", firstRows, "battle-2"),
      "user-a",
    ),
  );

  expect(repeated).toEqual({ itemId: "555", kills: 2 });
});

it("rejects a submission whose proof was issued for another character", async () => {
  const forged = {
    ...submission("101", "555", firstRows),
    margonemAccountProof: proofFor("battle-1", "9102", "102"),
  };

  const rejection = await run((weaponKills) =>
    weaponKills.recordWeaponKills(forged, "user-b").pipe(Effect.flip),
  );

  expect(rejection).toBeInstanceOf(PermissionDeniedError);
  expect((await pool.query("SELECT * FROM weapon_kills")).rows).toEqual([]);
});
