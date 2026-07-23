import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeOther } from "@/lib/margonem-runtime/runtime.types";
import { useOthersStore } from "./others.store";

const createOther = (name: string): RuntimeOther =>
  Object.freeze({
    accountId: "1",
    characterId: name,
    icon: `${name}.gif`,
    level: 300,
    name,
    profession: "w",
  });

describe("useOthersStore", () => {
  beforeEach(() => {
    useOthersStore.getState().clearOthers();
  });

  it("adds and updates other characters by id", () => {
    const first = createOther("first");
    const second = createOther("second");

    useOthersStore.getState().upsertOther("1", first);
    expect(useOthersStore.getState().getOther("1")).toBe(first);

    useOthersStore.getState().upsertOther("1", second);
    expect(useOthersStore.getState().getOther("1")).toBe(second);
  });

  it("removes other characters by id", () => {
    const other = createOther("other");

    useOthersStore.getState().upsertOther("1", other);
    useOthersStore.getState().removeOther("1");

    expect(useOthersStore.getState().getOther("1")).toBeUndefined();
  });

  it("sets many others and clears the store", () => {
    const first = createOther("first");
    const second = createOther("second");

    useOthersStore.getState().setMany({ 1: first, 2: second });
    expect(useOthersStore.getState().othersById).toEqual({
      1: first,
      2: second,
    });

    useOthersStore.getState().clearOthers();
    expect(useOthersStore.getState().othersById).toEqual({});
  });

  it("does not replace state when upserting the same runtime object", () => {
    const other = createOther("other");

    useOthersStore.getState().upsertOther("1", other);
    const firstState = useOthersStore.getState().othersById;

    useOthersStore.getState().upsertOther("1", other);

    expect(useOthersStore.getState().othersById).toBe(firstState);
  });

  it("applies mixed changes in one store publication", () => {
    const removed = createOther("removed");
    const updated = createOther("updated");
    const added = createOther("added");
    useOthersStore.getState().setMany({ removed, updated });
    const publish = vi.fn();
    const unsubscribe = useOthersStore.subscribe(publish);

    useOthersStore.getState().applyBatch({
      removeIds: ["removed"],
      upserts: { added, updated },
    });

    expect(useOthersStore.getState().othersById).toEqual({ added, updated });
    expect(publish).toHaveBeenCalledOnce();
    unsubscribe();
  });
});
