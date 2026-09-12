import { expect, test } from "bun:test";
import {
  setPath,
  unsetPath,
  type SettingsJsonRecord,
} from "./settings-paths.js";

test("setPath and unsetPath refuse paths that would reach Object.prototype", () => {
  const target: SettingsJsonRecord = {};

  expect(() => setPath(target, "__proto__.polluted", true)).toThrow(
    "Unsafe setting path",
  );
  expect(() => setPath(target, "hotkeys.constructor.prototype.x", 1)).toThrow(
    "Unsafe setting path",
  );
  expect(() => unsetPath(target, "__proto__.polluted")).toThrow(
    "Unsafe setting path",
  );
  const fresh: SettingsJsonRecord = {};
  expect(fresh.polluted).toBeUndefined();
  expect(target).toEqual({});
});

test("setPath creates nested records for ordinary paths", () => {
  const target: SettingsJsonRecord = {};
  setPath(target, "timers.generalConfig.compactView", true);
  expect(target).toEqual({ timers: { generalConfig: { compactView: true } } });
});
