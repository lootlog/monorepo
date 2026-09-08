import { expect, test } from "bun:test";
import { parseEventFixture } from "./publish.js";

test("event fixtures preserve arbitrary JSON payloads and validate routing metadata", () => {
  for (const payload of [
    null,
    42,
    "text",
    [1, true],
    { nested: { flag: false } },
  ]) {
    const fixture = { exchange: "test", routingKey: "custom.test", payload };
    expect(parseEventFixture(JSON.stringify(fixture))).toEqual(fixture);
  }
  expect(() =>
    parseEventFixture('{"exchange":42,"routingKey":"x","payload":{}}'),
  ).toThrow();
  expect(() => parseEventFixture('{"exchange":"x","payload":{}}')).toThrow();
});
