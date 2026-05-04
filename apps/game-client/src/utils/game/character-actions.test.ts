import { describe, expect, it, vi } from "vitest";
import {
  inviteCharacterToFriends,
  inviteCharacterToParty,
  sanitizeFriendInviteNick,
  showCharacterEquipment,
  showCharacterProfile,
} from "@/utils/game/character-actions";

describe("character actions", () => {
  it("sanitizes nicknames for friend invites", () => {
    expect(sanitizeFriendInviteNick(" Hero Name?&=# ")).toBe("Hero_Name");
  });

  it("uses game commands for party and friend invites", () => {
    const gameCommandSpy = vi.fn();
    window._g = gameCommandSpy;

    inviteCharacterToParty(10);
    inviteCharacterToFriends("Hero Name");

    expect(gameCommandSpy).toHaveBeenCalledWith("party&a=inv&id=10");
    expect(gameCommandSpy).toHaveBeenCalledWith(
      "friends&a=finvite&nick=Hero_Name",
    );
  });

  it("opens game equipment and profile windows", () => {
    const showEquipmentSpy = vi.fn();
    const showProfileSpy = vi.fn();
    window.Engine = {
      showEqManager: {
        update: showEquipmentSpy,
      },
      iframeWindowManager: {
        newPlayerProfile: showProfileSpy,
      },
    } as never;

    showCharacterEquipment({
      id: 10,
      nick: "Hero",
      icon: "hero.gif",
      lvl: 120,
      prof: "w",
      account: 20,
    });
    showCharacterProfile({
      accountId: 20,
      characterId: 10,
    });

    expect(showEquipmentSpy).toHaveBeenCalledWith({
      id: 10,
      nick: "Hero",
      icon: "hero.gif",
      lvl: 120,
      prof: "w",
      account: 20,
    });
    expect(showProfileSpy).toHaveBeenCalledWith({
      accountId: 20,
      characterId: 10,
    });
  });
});
