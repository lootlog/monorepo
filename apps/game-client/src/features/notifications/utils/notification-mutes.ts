import { NpcType } from "@/api/npcs.api";
import type { Notification } from "@/features/notifications/hooks/use-notifications";
import type {
  PartyGatheringNotification,
  StoredNotification,
} from "@/store/notifications.store";
import { getNpcType } from "@lootlog/domain/npc-type";
import {
  isDetectorNpcType,
  type DetectorNpcType,
} from "@lootlog/schema/account-preferences";
import type {
  MutedNpcPreference,
  MutedPlayerPreference,
  NotificationMutes,
} from "@lootlog/schema/user-preferences";

type MuteableNotification =
  | Notification
  | PartyGatheringNotification
  | StoredNotification;

const MAX_NPC_NAME_LENGTH = 256;

const getStableNpcId = (
  npcId: number,
  npcName: string,
  npcType: DetectorNpcType,
) => {
  // Colossi and Hero Trackers change their runtime id between spawn places.
  if (npcType === NpcType.COLOSSUS || npcType === NpcType.HERO_TRACKER) {
    const safeName = String(npcName ?? "");
    const length = Math.min(safeName.length, MAX_NPC_NAME_LENGTH);
    let hash = 0;

    for (let index = 0; index < length; index += 1) {
      const char = safeName.charCodeAt(index);
      hash = (hash << 5) - hash + char;
      hash &= hash;
    }

    return -Math.abs(hash || 1);
  }

  return Math.abs(npcId);
};

/** The NPC a notification reports, with the key its mute is stored under. */
const getNpcMuteTarget = (notification: MuteableNotification) => {
  if (!("npc" in notification) || !notification.npc) return null;

  const { npc } = notification;

  const npcType = getNpcType(NpcType, {
    wt: npc.wt,
    icon: npc.icon,
    isHeroFromEvent: npc.isHeroFromEvent,
    name: npc.name,
  });

  if (!isDetectorNpcType(npcType)) return null;

  const npcId = getStableNpcId(npc.id, npc.name, npcType);

  return { npc, npcType, npcId, npcKey: `npc:${npcId}` };
};

export const getNotificationNpcMuteKey = (notification: MuteableNotification) =>
  getNpcMuteTarget(notification)?.npcKey ?? null;

export const createMutedPlayerPreference = (
  notification: MuteableNotification,
  displayName: string,
): MutedPlayerPreference => {
  return {
    discordId: notification.discordId,
    displayName,
  };
};

export const createMutedNpcPreference = (
  notification: MuteableNotification,
): MutedNpcPreference | null => {
  const target = getNpcMuteTarget(notification);

  if (!target) return null;

  const { npc, npcType, npcId, npcKey } = target;

  return {
    npcKey,
    npcId,
    name: npc.name,
    npcType,
    lvl: Math.max(1, npc.lvl),
    prof: npc.prof ?? null,
    icon: npc.icon ?? null,
  };
};

export const isNotificationMuted = (
  notification: MuteableNotification,
  mutes: NotificationMutes,
) => {
  if (
    mutes.players.some((player) => player.discordId === notification.discordId)
  ) {
    return true;
  }

  const npcKey = getNotificationNpcMuteKey(notification);

  if (!npcKey) {
    return false;
  }

  return mutes.npcs.some((npc) => npc.npcKey === npcKey);
};

export const appendMutedPlayer = (
  mutes: NotificationMutes,
  player: MutedPlayerPreference,
) => {
  if (
    mutes.players.some(
      (currentPlayer) => currentPlayer.discordId === player.discordId,
    )
  ) {
    return mutes.players.map((currentPlayer) =>
      currentPlayer.discordId === player.discordId
        ? { ...player }
        : currentPlayer,
    );
  }

  return [...mutes.players, { ...player }];
};

export const appendMutedNpc = (
  mutes: NotificationMutes,
  npc: MutedNpcPreference,
) => {
  if (mutes.npcs.some((currentNpc) => currentNpc.npcKey === npc.npcKey)) {
    return mutes.npcs.map((currentNpc) =>
      currentNpc.npcKey === npc.npcKey ? { ...npc } : currentNpc,
    );
  }

  return [...mutes.npcs, { ...npc }];
};
