import { describe, expect, it } from "bun:test";
import { makeNotificationContent } from "#src/notifications/content/notification-content.service";
import {
  NotificationTargetType,
  NotificationTriggerType,
} from "#src/notifications/notification-enums";

const content = makeNotificationContent();

const channel = { targetType: NotificationTargetType.CHANNEL };

const heroSighting = (
  contentTemplate: string | null,
  reported: { heroName: string; mapName: string },
) =>
  content.buildHeroSightingPayload({
    notificationRule: {
      id: 1,
      name: "Herosi",
      triggerType: NotificationTriggerType.HERO_SIGHTED,
      contentTemplate,
    },
    target: channel,
    sighting: {
      id: 1,
      world: "tarhuna",
      hero: { name: reported.heroName, lvl: 100 },
      heroLevel: "100",
      mapName: reported.mapName,
      detectedBy: "@here",
    },
    transition: "SPAWNED",
  });

const manualTimer = (contentTemplate: string | null, npcName: string) => {
  const at = new Date("2026-11-05T12:00:00.000Z");

  return content.buildTimerNotificationPayload({
    notificationRule: {
      id: 2,
      name: "Timery",
      triggerType: NotificationTriggerType.TIMER_BEFORE_SPAWN,
      contentTemplate,
      scheduleStrategy: null,
      scheduleAnchor: null,
      scheduleOffsetMinutes: null,
    },
    target: channel,
    npcId: 1,
    npcName,
    world: "tarhuna",
    timerKey: "manual:1",
    minSpawnTime: at,
    maxSpawnTime: at,
    scheduledFor: at,
  });
};

describe("notification mentions", () => {
  it("does not let Member-reported hero sighting text ping @everyone or a role", () => {
    const payload = heroSighting(null, {
      heroName: "<@&123>",
      mapName: "@everyone",
    });

    expect(payload.content).toContain("@everyone");
    expect(payload.allowedMentions).toBeUndefined();
  });

  it("does not let a Member-named manual timer ping @here", () => {
    expect(manualTimer(null, "@here").allowedMentions).toBeUndefined();
  });

  it("keeps mentions an admin wrote in the template", () => {
    const payload = heroSighting("<@&456> @everyone {{heroName}} {{mapName}}", {
      heroName: "<@&123>",
      mapName: "Mapa",
    });

    expect(payload.allowedMentions).toEqual({
      repliedUser: false,
      parse: ["everyone"],
      roles: ["456"],
    });
  });
});
