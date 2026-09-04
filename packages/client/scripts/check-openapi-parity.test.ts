import { expect, test } from "bun:test";
import { normalizeOpenApiRepresentation } from "./check-openapi-parity.js";

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
