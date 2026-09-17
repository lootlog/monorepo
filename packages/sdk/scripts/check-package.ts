import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const sdk = resolve(import.meta.dirname, "..");

const args = process.argv.slice(2);

if (
  args.length !== 0 &&
  (args.length !== 2 || args[0] !== "--pack-destination" || !args[1])
)
  throw new Error("Usage: check-package.ts [--pack-destination <directory>]");

const packDestination = args[1] ? resolve(args[1]) : undefined;

const consumer = mkdtempSync(resolve(tmpdir(), "lootlog-sdk-consumer-"));

function run(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });

  if (result.status !== 0)
    throw new Error(`Packed consumer check failed: ${command}`);
}

const archives: Record<string, string> = {};

for (const name of ["sdk", "game-client-api"]) {
  const cwd = resolve(sdk, "..", name);
  run(process.execPath, ["run", "build"], cwd);
  run("npm", ["pack", "--ignore-scripts", "--pack-destination", consumer], cwd);
  const matches = [...new Bun.Glob(`lootlog-${name}-*.tgz`).scanSync(consumer)];

  if (matches.length !== 1 || !matches[0])
    throw new Error(`Expected one packed archive for @lootlog/${name}`);
  archives[`@lootlog/${name}`] = `file:${matches[0]}`;
}

writeFileSync(
  resolve(consumer, "package.json"),
  JSON.stringify({
    type: "module",
    dependencies: {
      ...archives,
      typescript: "7.0.2",
      "@types/node": "^26.4.0",
    },
  }),
);

run(process.execPath, ["install", "--ignore-scripts"], consumer);

writeFileSync(
  resolve(consumer, "check.ts"),
  `
import { configureLootlogApi } from '@lootlog/sdk';
import { usersControllerGetCurrentUserGuilds } from '@lootlog/sdk/main';
import { RealtimeClient, REALTIME_JSON_SUBPROTOCOL } from '@lootlog/sdk/realtime';
import * as activity from '@lootlog/sdk/activity';
import * as battles from '@lootlog/sdk/battlelog';
import * as search from '@lootlog/sdk/search';
import type { LootlogGameClientApi } from '@lootlog/game-client-api';
import { strict as assert } from 'node:assert';
assert.ok(Object.keys(activity).length > 0);
assert.ok(Object.keys(battles).length > 0);
assert.ok(Object.keys(search).length > 0);
let calls = 0;
const restore = configureLootlogApi({apiKey:'test-only', fetch: async (input,init) => {
  assert.equal(String(input),'https://api.lootlog.pl/users/@me/guilds');
  assert.equal(new Headers(init?.headers).get('X-Api-Key'),'test-only');
  calls++; return new Response('[]',{headers:{'content-type':'application/json'}});
}});
assert.deepEqual(await usersControllerGetCurrentUserGuilds(),[]);
assert.equal(calls,1); restore();
const realtime = new RealtimeClient({url:'wss://gateway.lootlog.pl/ws',protocols:[REALTIME_JSON_SUBPROTOCOL]});
assert.equal(realtime.state,'disconnected');
const version: LootlogGameClientApi['apiVersion'] = 1;
assert.equal(version,1);
`,
);

run(process.execPath, ["check.ts"], consumer);

run(
  resolve(consumer, "node_modules/.bin/tsc"),
  [
    "--noEmit",
    "--strict",
    "--types",
    "node",
    "--target",
    "ES2022",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "check.ts",
  ],
  consumer,
);

if (packDestination) {
  mkdirSync(packDestination, { recursive: true });

  for (const archive of Object.values(archives)) {
    const filename = archive.slice("file:".length);
    await Bun.write(
      resolve(packDestination, filename),
      Bun.file(resolve(consumer, filename)),
    );
  }
}

process.stdout.write(`Packed consumer verified: ${consumer}\n`);
