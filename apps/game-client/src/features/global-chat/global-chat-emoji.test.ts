import { describe, expect, it } from "vitest";
import { searchGlobalChatEmoji } from "./global-chat-emoji";

describe("searchGlobalChatEmoji", () => {
  it("finds emoji by Polish name typed without diacritics", () => {
    expect(searchGlobalChatEmoji("ogien")).toContain("🔥");
  });

  it("finds emoji by English name", () => {
    expect(searchGlobalChatEmoji("Fire")).toContain("🔥");
  });

  it("finds emoji written with a variation selector, by every word in any order", () => {
    expect(searchGlobalChatEmoji("serce czerwone")).toContain("❤️");
  });

  it("finds nothing for an unknown name", () => {
    expect(searchGlobalChatEmoji("qwertyuiop")).toEqual([]);
  });
});
