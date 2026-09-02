import { expect, test } from "bun:test";
import { exportBoundaryGroups } from "./export-boundary-groups.js";

test("exports the generated groups used by the native boundary tests", () => {
  const source = [
    'class HealthGroup extends HttpApiGroup.make("health") {}',
    'class UserLootlogConfigGroup extends HttpApiGroup.make("user-lootlog-config") {}',
  ].join("\n");

  const exported = exportBoundaryGroups(source);
  expect(exported).toContain("export class HealthGroup");
  expect(exported).toContain("export class UserLootlogConfigGroup");
  expect(exportBoundaryGroups(exported)).toBe(exported);
});

test("fails closed when a generated group declaration changes", () => {
  expect(() => exportBoundaryGroups("class HealthGroup {}" as string)).toThrow(
    "expected one HealthGroup declaration",
  );
});
