import type { Other } from "@lootlog/margonem/others";
import { beforeEach, describe, expect, it } from "vitest";
import {
  runtimeOtherHandles,
  upsertRuntimeOtherHandleForCompatibility,
} from "./runtime-other-handles";

describe("runtimeOtherHandles", () => {
  beforeEach(() => {
    runtimeOtherHandles.clear();
  });

  it("preserves the collection when an update keeps the same runtime handle", () => {
    const handle = { d: { id: "1" } } as Other;
    upsertRuntimeOtherHandleForCompatibility("1", handle);
    const handles = runtimeOtherHandles.getAll();

    upsertRuntimeOtherHandleForCompatibility("1", handle);

    expect(runtimeOtherHandles.getAll()).toBe(handles);
  });
});
