import { describe, expect, it } from "vitest";
import {
  buildChatMentionContext,
  getChatMentionMemberColorsByName,
  getChatMentionNotificationId,
  getChatMentionRoleColorsByName,
  getChatMentionSegments,
  getCurrentUserMentionNames,
  getCurrentUserMentionRoleNames,
  getDiscordColorHex,
  hasCurrentUserMention,
} from "./chat-mentions.helpers";

describe("chat mentions helpers", () => {
  it("parses member and role mentions into renderable segments", () => {
    expect(
      getChatMentionSegments("hej @Hero i @Raid Team", {
        memberNames: ["Hero"],
        roleNames: ["Raid Team"],
        memberColorsByName: {
          hero: "12ab34",
        },
        roleColorsByName: {
          "raid team": "ff8800",
        },
      }),
    ).toEqual([
      {
        text: "hej ",
        isMention: false,
        isCurrentUserTarget: false,
        color: null,
      },
      {
        text: "@Hero",
        isMention: true,
        isCurrentUserTarget: false,
        kind: "member",
        color: "12ab34",
        normalizedName: "hero",
      },
      {
        text: " i ",
        isMention: false,
        isCurrentUserTarget: false,
        color: null,
      },
      {
        text: "@Raid Team",
        isMention: true,
        isCurrentUserTarget: false,
        kind: "role",
        color: "ff8800",
        normalizedName: "raid team",
      },
    ]);
  });

  it("marks current user and current role mentions as targeted", () => {
    expect(
      getChatMentionSegments("@Hero ruszajcie z @Raid Team", {
        currentUserNames: ["Hero"],
        currentUserRoleNames: ["Raid Team"],
        memberColorsByName: {
          hero: "12ab34",
        },
        roleColorsByName: {
          "raid team": "ff8800",
        },
      }).filter((segment) => segment.isMention),
    ).toEqual([
      {
        text: "@Hero",
        isMention: true,
        isCurrentUserTarget: true,
        kind: "member",
        color: "12ab34",
        normalizedName: "hero",
      },
      {
        text: "@Raid Team",
        isMention: true,
        isCurrentUserTarget: true,
        kind: "role",
        color: "ff8800",
        normalizedName: "raid team",
      },
    ]);
  });

  it("detects whether the current user was mentioned", () => {
    expect(
      hasCurrentUserMention("hej @Hero", {
        currentUserNames: ["Hero"],
        currentUserRoleNames: [],
      }),
    ).toBe(true);

    expect(
      hasCurrentUserMention("hej @Inny", {
        currentUserNames: ["Hero"],
        currentUserRoleNames: ["Raid Team"],
      }),
    ).toBe(false);
  });

  it("builds current user aliases and role names without duplicates", () => {
    const currentMember = {
      name: "Hero",
      roles: [{ name: "Raid Team" }, { name: "Raid Team" }],
    };

    expect(
      getCurrentUserMentionNames({
        currentCharacterNick: "Hero",
        currentMember: currentMember as never,
      }),
    ).toEqual(["Hero"]);
    expect(getCurrentUserMentionRoleNames(currentMember as never)).toEqual([
      "Raid Team",
    ]);
  });

  it("builds a complete mention context from members, roles, messages and current member", () => {
    expect(
      buildChatMentionContext({
        currentCharacterNick: "Hero",
        currentMember: {
          name: "Hero",
          roles: [{ name: "Raid Team" }],
        } as never,
        members: [
          {
            id: 1,
            userId: "user-1",
            name: "Hero",
            color: 0x12ab34,
          },
        ],
        messages: [
          {
            characterData: {
              nick: "Scout",
            },
          },
        ] as never,
        roles: [
          {
            id: "role-1",
            guildId: "guild-1",
            name: "Raid Team",
            color: 0xff8800,
            permissions: [],
          },
        ],
      }),
    ).toEqual({
      memberNames: ["Hero", "Scout"],
      roleNames: ["Raid Team"],
      currentUserNames: ["Hero"],
      currentUserRoleNames: ["Raid Team"],
      memberColorsByName: {
        hero: "12ab34",
      },
      roleColorsByName: {
        "raid team": "ff8800",
      },
    });
  });

  it("builds a stable notification id for chat mentions", () => {
    expect(
      getChatMentionNotificationId({
        guildId: "guild-1",
        messageId: "message-1",
      }),
    ).toBe("chat-mention:guild-1:message-1");
  });

  it("builds normalized member and role color lookups", () => {
    expect(
      getChatMentionMemberColorsByName([
        {
          id: 1,
          userId: "user-1",
          name: "Hero",
          color: 0x12ab34,
        },
      ]),
    ).toEqual({
      hero: "12ab34",
    });

    expect(
      getChatMentionRoleColorsByName([
        {
          id: "role-1",
          guildId: "guild-1",
          name: "Raid Team",
          color: 0xff8800,
          permissions: [],
        },
      ]),
    ).toEqual({
      "raid team": "ff8800",
    });
  });

  it("treats missing or zero discord colors as no special color", () => {
    expect(getDiscordColorHex(undefined)).toBeNull();
    expect(getDiscordColorHex(null)).toBeNull();
    expect(getDiscordColorHex(0)).toBeNull();
  });
});
