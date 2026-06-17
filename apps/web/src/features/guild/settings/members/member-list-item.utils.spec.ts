import { describe, expect, it } from "vitest";
import {
  getMemberListItemClassName,
  getMemberOnlineSources,
} from "./member-list-item.utils";

describe("member list item utils", () => {
  it("uses green border classes for online members", () => {
    const className = getMemberListItemClassName({
      isOnline: true,
      isActive: true,
    });

    expect(className).toContain("border-emerald-500/50");
    expect(className).toContain("shadow-emerald-500/10");
    expect(className).not.toContain("opacity-50");
  });

  it("keeps inactive opacity without online border for offline members", () => {
    const className = getMemberListItemClassName({
      isOnline: false,
      isActive: false,
    });

    expect(className).not.toContain("border-emerald-500/50");
    expect(className).toContain("opacity-50");
  });

  it("returns no online sources for offline members", () => {
    expect(
      getMemberOnlineSources({
        isOnlineOnWeb: false,
        isOnlineInGame: false,
      }),
    ).toEqual([]);
  });

  it("returns web source for web online members", () => {
    expect(
      getMemberOnlineSources({
        isOnlineOnWeb: true,
        isOnlineInGame: false,
      }),
    ).toEqual(["web"]);
  });

  it("returns game source for game online members", () => {
    expect(
      getMemberOnlineSources({
        isOnlineOnWeb: false,
        isOnlineInGame: true,
      }),
    ).toEqual(["game"]);
  });

  it("returns both online sources for web and game online members", () => {
    expect(
      getMemberOnlineSources({
        isOnlineOnWeb: true,
        isOnlineInGame: true,
      }),
    ).toEqual(["web", "game"]);
  });
});
