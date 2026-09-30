import { describe, expect, it } from "vitest";
import {
  buildNotificationRuleNpcFilterPayload,
  getNotificationRuleNpcIdsForSubmit,
  parseManualNotificationRuleNpcIds,
  toTimerNpcSearchSelection,
} from "./notification-rule-form-npc.utils";
import { getGuildNotificationRuleNpcIds } from "./notification-settings.utils";

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

  it("sends a timer with a template as every spawn, one without as its own id, and restores both when the rule is reopened", () => {
    const selections = [
      toTimerNpcSearchSelection({ npcId: 313_103, templateId: 257_636 }, false),
      toTimerNpcSearchSelection({ npcId: 313_104, templateId: null }, false),
    ].filter((selection) => selection !== null);

    const payload = buildNotificationRuleNpcFilterPayload(selections);

    expect(payload).toStrictEqual({
      npcIds: [313_104],
      npcTemplateIds: [257_636],
    });
    expect(
      getGuildNotificationRuleNpcIds({ filters: payload }).sort(),
    ).toStrictEqual([...selections].sort());
    expect(
      parseManualNotificationRuleNpcIds(selections.join("\n")).ids,
    ).toStrictEqual(selections);
  });

  it("does not narrow an all-world rule to a timer without a template", () => {
    expect(
      toTimerNpcSearchSelection({ npcId: 313_104, templateId: null }, true),
    ).toBeNull();
  });

  it("builds a multi npc payload when many ids are selected", () => {
    expect(
      buildNotificationRuleNpcFilterPayload(["101", "202", "303"]),
    ).toStrictEqual({
      npcIds: [101, 202, 303],
    });
  });
});
