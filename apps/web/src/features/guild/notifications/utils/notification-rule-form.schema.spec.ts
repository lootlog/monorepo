import { describe, expect, it } from "vitest";
import {
  NotificationScheduleAnchor,
  NotificationTriggerType,
} from "@lootlog/schema/notifications";
import {
  ALL_WORLDS_VALUE,
  ruleFormSchema,
} from "./notification-rule-form.schema";

const t = (key: string, options?: Record<string, unknown>) =>
  options?.count ? `${key}:${options.count}` : key;

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
  it("requires at least one manual npc id when manual mode is enabled", () => {
    const result = ruleFormSchema(t, 5).safeParse({
      ...createBaseTimerFormValues(),
      manualNpcEntry: true,
      npcIds: [],
      manualNpcIds: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["manualNpcIds"],
          message: "settings.notifications.validation.manualNpcIdsRequired",
        }),
      ]),
    );
  });

  it("rejects invalid manual npc ids", () => {
    const result = ruleFormSchema(t, 5).safeParse({
      ...createBaseTimerFormValues(),
      manualNpcEntry: true,
      npcIds: [],
      manualNpcIds: "101, abc",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["manualNpcIds"],
          message: "settings.notifications.validation.manualNpcIdsInvalid",
        }),
      ]),
    );
  });

  it("enforces the same npc limit in manual mode", () => {
    const result = ruleFormSchema(t, 2).safeParse({
      ...createBaseTimerFormValues(),
      manualNpcEntry: true,
      npcIds: [],
      manualNpcIds: "101, 202, 303",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["manualNpcIds"],
          message: "settings.notifications.validation.maxNpcCount:2",
        }),
      ]),
    );
  });

  it("still requires a world for timer notifications", () => {
    const result = ruleFormSchema(t, 5).safeParse({
      ...createBaseTimerFormValues(),
      world: ALL_WORLDS_VALUE,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["world"],
          message: "settings.notifications.validation.worldRequired",
        }),
      ]),
    );
  });
});
