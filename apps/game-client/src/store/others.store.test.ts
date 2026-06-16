import { beforeEach, describe, expect, it } from "vitest";
import type { Other } from "@lootlog/margonem";
import { useOthersStore } from "./others.store";

const createOther = (nick: string): Other =>
  ({
    d: {
      account: 1,
      icon: `${nick}.gif`,
      id: nick,
      lvl: 300,
      nick,
      prof: "w",
    },
  }) as Other;

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
});
