import { describe, expect, it } from "vitest";
import {
  buildNotificationRuleNpcFilterPayload,
  getNotificationRuleNpcIdsForSubmit,
  parseManualNotificationRuleNpcIds,
} from "./notification-rule-form-npc.utils";

describe("notificationRuleFormNpcUtils", () => {
  it("parses many manual npc ids with mixed separators", () => {
    expect(
      parseManualNotificationRuleNpcIds("101, 202\n303 404"),
    ).toStrictEqual({
      ids: ["101", "202", "303", "404"],
      invalidTokens: [],
    });
  });

  it("deduplicates manual npc ids and normalizes leading zeroes", () => {
    expect(parseManualNotificationRuleNpcIds("001,1\n0002,2")).toStrictEqual({
      ids: ["1", "2"],
      invalidTokens: [],
    });
  });

  it("reports invalid manual npc id tokens", () => {
    expect(parseManualNotificationRuleNpcIds("101, abc, -2, 0")).toStrictEqual({
      ids: ["101"],
      invalidTokens: ["abc", "-2", "0"],
    });
  });

  it("returns manual npc ids when manual mode is enabled", () => {
    expect(
      getNotificationRuleNpcIdsForSubmit({
        manualNpcEntry: true,
        manualNpcIds: "10, 20\n30",
        npcIds: ["99"],
      }),
    ).toStrictEqual(["10", "20", "30"]);
  });

  it("returns selected npc ids when manual mode is disabled", () => {
    expect(
      getNotificationRuleNpcIdsForSubmit({
        manualNpcEntry: false,
        manualNpcIds: "10, 20\n30",
        npcIds: ["15", "15", "25"],
      }),
    ).toStrictEqual(["15", "25"]);
  });

  it("builds a single npc payload when exactly one id is selected", () => {
    expect(buildNotificationRuleNpcFilterPayload(["101"])).toStrictEqual({
      npcId: 101,
    });
  });

  it("builds a multi npc payload when many ids are selected", () => {
    expect(
      buildNotificationRuleNpcFilterPayload(["101", "202", "303"]),
    ).toStrictEqual({
      npcIds: [101, 202, 303],
    });
  });
});
