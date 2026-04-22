import { describe, expect, it } from "vitest";
import {
  getChatMentionNotificationId,
  getChatMentionSegments,
  getCurrentUserMentionNames,
  getCurrentUserMentionRoleNames,
  hasCurrentUserMention,
} from "./chat-mentions.helpers";

describe("chat mentions helpers", () => {
  it("parses member and role mentions into renderable segments", () => {
    expect(
      getChatMentionSegments("hej @Hero i @Raid Team", {
        memberNames: ["Hero"],
        roleNames: ["Raid Team"],
      }),
    ).toEqual([
      {
        text: "hej ",
        isMention: false,
        isCurrentUserTarget: false,
      },
      {
        text: "@Hero",
        isMention: true,
        isCurrentUserTarget: false,
      },
      {
        text: " i ",
        isMention: false,
        isCurrentUserTarget: false,
      },
      {
        text: "@Raid Team",
        isMention: true,
        isCurrentUserTarget: false,
      },
    ]);
  });

  it("marks current user and current role mentions as targeted", () => {
    expect(
      getChatMentionSegments("@Hero ruszajcie z @Raid Team", {
        currentUserNames: ["Hero"],
        currentUserRoleNames: ["Raid Team"],
      }).filter((segment) => segment.isMention),
    ).toEqual([
      {
        text: "@Hero",
        isMention: true,
        isCurrentUserTarget: true,
      },
      {
        text: "@Raid Team",
        isMention: true,
        isCurrentUserTarget: true,
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

  it("builds a stable notification id for chat mentions", () => {
    expect(
      getChatMentionNotificationId({
        guildId: "guild-1",
        messageId: "message-1",
      }),
    ).toBe("chat-mention:guild-1:message-1");
  });
});
