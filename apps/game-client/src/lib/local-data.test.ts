import { describe, expect, it } from "vitest";
import { storageKey } from "@/lib/storage-key";
import { clearLootlogLocalData } from "./local-data";

describe("clearLootlogLocalData", () => {
  it("removes only Lootlog keys and leaves the game's own storage intact", () => {
    localStorage.clear();
    localStorage.setItem(storageKey("ll-windows-state"), "{}");
    localStorage.setItem(storageKey("ll:settings:state"), "{}");
    localStorage.setItem(storageKey("ll:recent-worlds:1:2"), "[]");
    localStorage.setItem("lootlog:margonem-character-list:v1:pl:1:x", "[]");
    localStorage.setItem("margonem-setting", "1");
    localStorage.setItem("llama", "not ours");

    clearLootlogLocalData(localStorage);

    const remaining = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    ).sort();

    expect(remaining).toEqual(["llama", "margonem-setting"]);
  });
});
