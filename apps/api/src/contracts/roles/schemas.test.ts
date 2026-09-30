import { expect, it } from "bun:test";
import { Schema } from "effect";
import { UpdateRolePermissionsRequest } from "./schemas.js";

it("accepts only whole, ordered role level ranges within 0-500", () => {
  const isValid = Schema.is(UpdateRolePermissionsRequest);

  const range = (lvlRangeFrom: number, lvlRangeTo: number) => ({
    permissions: [],
    lvlRangeFrom,
    lvlRangeTo,
  });

  expect(isValid(range(0, 500))).toBe(true);
  expect(isValid(range(200, 200))).toBe(true);
  expect(isValid(range(300, 200))).toBe(false);
  expect(isValid(range(-1, 200))).toBe(false);
  expect(isValid(range(0, 501))).toBe(false);
  expect(isValid(range(10.5, 200))).toBe(false);
});
