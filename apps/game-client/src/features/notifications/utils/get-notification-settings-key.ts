import { NpcType } from "@/api/npcs.api";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import type { NotificationType } from "@lootlog/schema/account-preferences";

const notificationSettingsKeys = [
  NpcType.ELITE2,
  NpcType.HERO,
  NpcType.COLOSSUS,
  NpcType.TITAN,
  "message",
  "party-gathering",
] as const satisfies readonly NotificationType[];

const notificationSettingsKeySet = new Set<string>(notificationSettingsKeys);

type NotificationSettingsKeySource = {
  type?: string;
  npc?: {
    wt?: number | null;
  } | null;
};

export const isNotificationSettingsKey = (
  key: string,
): key is NotificationType => {
  return notificationSettingsKeySet.has(key);
};

export const getNotificationSettingsKey = (
  notification: NotificationSettingsKeySource,
) => {
  if (notification.type === "party-gathering") {
    return "party-gathering";
  }

  if (!notification.npc?.wt) {
    return "message";
  }

  return getNpcTypeByWt(NpcType, notification.npc.wt);
};
