import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const sdk = resolve(import.meta.dirname, "..");
const consumer = mkdtempSync(resolve(tmpdir(), "lootlog-sdk-consumer-"));
function run(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`Packed consumer check failed: ${command}`);
}
for (const name of ["sdk", "game-client-api"]) {
  const cwd = resolve(sdk, "..", name);
  run(process.execPath, ["run", "build"], cwd);
  run("npm", ["pack", "--ignore-scripts", "--pack-destination", consumer], cwd);
}
writeFileSync(
  resolve(consumer, "package.json"),
  JSON.stringify({
    type: "module",
    dependencies: {
      "@lootlog/sdk": "file:lootlog-sdk-0.1.0.tgz",
      "@lootlog/game-client-api": "file:lootlog-game-client-api-0.1.0.tgz",
      typescript: "5.9.3",
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
import type { LootlogGameClientApi } from '@lootlog/game-client-api';
import { strict as assert } from 'node:assert';
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
    "--skipLibCheck",
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
process.stdout.write(`Packed consumer verified: ${consumer}\n`);
