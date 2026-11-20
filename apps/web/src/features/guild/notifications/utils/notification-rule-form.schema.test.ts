import type { TOptions } from "i18next";
import { describe, expect, it } from "vitest";
import {
  NotificationScheduleAnchor,
  NotificationTriggerType,
} from "@lootlog/schema/notifications";
import {
  ALL_WORLDS_VALUE,
  ruleFormSchema,
} from "./notification-rule-form.schema";

const t = (key: string, options?: TOptions) =>
  options?.count ? `${key}:${options.count}` : key;

const validate = (
  maxNpcCount: number,
  values: Parameters<
    ReturnType<typeof ruleFormSchema>["~standard"]["validate"]
  >[0],
) => {
  const result = ruleFormSchema(t, maxNpcCount)["~standard"].validate(values);

  if (result instanceof Promise) throw new Error("Expected sync validation");

  return result;
};

const createBaseTimerFormValues = () => ({
  name: "",
  triggerType: NotificationTriggerType.TIMER_BEFORE_SPAWN,
  world: "Berufs",
  npcIds: ["101"],
  manualNpcEntry: false,
  manualNpcIds: "",
  contentTemplate: "test",
  scheduleAnchor: NotificationScheduleAnchor.MIN_SPAWN,
  scheduleOffsetMinutes: "0",
  scheduledAt: "",
  scheduleIntervalType: undefined,
  scheduleIntervalValue: "",
  scheduleTimeOfDay: "",
  scheduleWeekday: "",
  scheduledUntil: "",
  targetIds: ["1"],
  enabled: true,
});

describe("ruleFormSchema", () => {
  it("reports missing content and targets alongside an invalid level", () => {
    const result = validate(5, {
      ...createBaseTimerFormValues(),
      contentTemplate: " ",
      targetIds: [],
      npcLevelMin: 1.5,
    });

    expect(result.issues?.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([
        ["npcLevelMin"],
        ["contentTemplate"],
        ["targetIds"],
      ]),
    );
  });

  it("requires at least one manual npc id when manual mode is enabled", () => {
    const result = validate(5, {
      ...createBaseTimerFormValues(),
      manualNpcEntry: true,
      npcIds: [],
      manualNpcIds: "",
    });

    expect(result.issues).toBeDefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["manualNpcIds"],
          message: "settings.notifications.validation.manualNpcIdsRequired",
        }),
      ]),
    );
  });

  it("rejects invalid manual npc ids", () => {
    const result = validate(5, {
      ...createBaseTimerFormValues(),
      manualNpcEntry: true,
      npcIds: [],
      manualNpcIds: "101, abc",
    });

    expect(result.issues).toBeDefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["manualNpcIds"],
          message: "settings.notifications.validation.manualNpcIdsInvalid",
        }),
      ]),
    );
  });

  it("enforces the same npc limit in manual mode", () => {
    const result = validate(2, {
      ...createBaseTimerFormValues(),
      manualNpcEntry: true,
      npcIds: [],
      manualNpcIds: "101, 202, 303",
    });

    expect(result.issues).toBeDefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["manualNpcIds"],
          message: "settings.notifications.validation.maxNpcCount:2",
        }),
      ]),
    );
  });

  it("accepts a timer rule for all worlds so saved all-world rules stay editable", () => {
    const result = validate(5, {
      ...createBaseTimerFormValues(),
      world: ALL_WORLDS_VALUE,
    });

    expect(result.issues).toBeUndefined();
  });

  it("rejects a hero sighting rule whose level range is reversed", () => {
    const heroRule = {
      ...createBaseTimerFormValues(),
      triggerType: NotificationTriggerType.HERO_SIGHTED,
      npcIds: [],
    };

    const reversed = validate(5, {
      ...heroRule,
      npcLevelMin: 300,
      npcLevelMax: 250,
    });

    expect(reversed.issues).toEqual([
      expect.objectContaining({
        path: ["npcLevelMax"],
        message: "settings.notifications.validation.npcLevelOrder",
      }),
    ]);
    expect(
      validate(5, { ...heroRule, npcLevelMin: 300 }).issues,
    ).toBeUndefined();
  });
});
