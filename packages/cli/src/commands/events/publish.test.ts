import { expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseEventFixture } from "./publish.js";

const fixturesDir = path.join(import.meta.dirname, "../../events/fixtures");

// A fixture that drifts from the RabbitMQ contract is rejected by its consumer.
test("every shipped fixture is a valid canonical event", async () => {
  const files = (await fs.readdir(fixturesDir)).filter((file) =>
    file.endsWith(".json"),
  );

  expect(files.length).toBeGreaterThan(0);

  for (const file of files) {
    const content = await fs.readFile(path.join(fixturesDir, file), "utf-8");
    expect(() => parseEventFixture(content), file).not.toThrow();
  }
});

test("rejects fixtures for unknown routing keys or invalid payloads", () => {
  expect(() =>
    parseEventFixture('{"routingKey":"loot.created","payload":{}}'),
  ).toThrow();
  expect(() =>
    parseEventFixture(
      '{"routingKey":"activity.log.create","payload":{"type":"LOOT_EVENT"}}',
    ),
  ).toThrow();
});
