import { expect, test } from "bun:test";
import {
  normalizeAllowedChanges,
  normalizeOpenApiRepresentation,
} from "./check-openapi-parity.js";

test("enum order is immaterial but allowed values must remain identical", () => {
  const normalize = (values: string[]) =>
    normalizeOpenApiRepresentation({ schema: { enum: values } });
  expect(normalize(["TITAN", "COLOSSUS"])).toEqual(
    normalize(["COLOSSUS", "TITAN"]),
  );
  expect(normalize(["TITAN", "COLOSSUS"])).not.toEqual(
    normalize(["TITAN", "HERO"]),
  );
  expect(normalize(["TITAN", "COLOSSUS"])).not.toEqual(normalize(["TITAN"]));
});

test("Organization 404 exceptions require the declared response", () => {
  const operation = "GET /guilds/{guildId}/members/summary";
  expect(() =>
    normalizeAllowedChanges("api", operation, { responses: { "200": {} } }),
  ).toThrow("must declare a 404 response");
  expect(
    normalizeAllowedChanges("api", operation, {
      responses: { "200": {}, "404": { description: "Not Found" } },
    }),
  ).toEqual({ responses: { "200": {} } });
});
