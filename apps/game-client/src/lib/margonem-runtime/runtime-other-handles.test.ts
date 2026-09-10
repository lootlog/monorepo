import type { Other } from "@lootlog/margonem/others";
import { beforeEach, describe, expect, it } from "vitest";
import { runtimeOtherHandles } from "./runtime-other-handles";

describe("runtimeOtherHandles", () => {
  beforeEach(() => {
    runtimeOtherHandles.clear();
  });

  it("preserves the collection when an update keeps the same runtime handle", () => {
    const handle: Other = {
      d: {
        id: "1",
        account: 1,
        icon: "other.gif",
        lvl: 300,
        nick: "Other",
        prof: "w",
      },
    };

    runtimeOtherHandles.applyBatch({ upserts: { 1: handle } });
    const handles = runtimeOtherHandles.getAll();

    runtimeOtherHandles.applyBatch({ upserts: { 1: handle } });

    expect(runtimeOtherHandles.getAll()).toBe(handles);
  });

  it("keeps a handle that is removed and upserted in the same batch", () => {
    const handle: Other = {
      d: {
        id: "1",
        account: 1,
        icon: "other.gif",
        lvl: 300,
        nick: "Other",
        prof: "w",
      },
    };

    runtimeOtherHandles.applyBatch({ upserts: { 1: handle } });

    runtimeOtherHandles.applyBatch({
      removeIds: ["1"],
      upserts: { 1: handle },
    });

    expect(runtimeOtherHandles.get("1")).toBe(handle);
  });
});
