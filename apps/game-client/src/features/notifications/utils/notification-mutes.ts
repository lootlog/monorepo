import { NpcType } from "@/api/npcs.api";
import type { Notification } from "@/features/notifications/hooks/use-notifications";
import type {
  PartyGatheringNotification,
  StoredNotification,
} from "@/store/notifications.store";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import type { DetectorNpcType } from "@lootlog/schema/account-preferences";
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
  if (npcType === NpcType.COLOSSUS) {
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

const getDetectorNpcType = (
  notification: MuteableNotification,
): DetectorNpcType | null => {
  if (!("npc" in notification) || !notification.npc) {
    return null;
  }

  const npcType = getNpcTypeByWt(NpcType, notification.npc.wt);

  if (
    npcType !== NpcType.ELITE2 &&
    npcType !== NpcType.HERO &&
    npcType !== NpcType.COLOSSUS &&
    npcType !== NpcType.TITAN
  ) {
    return null;
  }

  return npcType;
};

export const getNotificationNpcMuteKey = (
  notification: MuteableNotification,
) => {
  if (!("npc" in notification) || !notification.npc) {
    return null;
  }

  const npcType = getDetectorNpcType(notification);

  if (!npcType) {
    return null;
  }

  const stableNpcId = getStableNpcId(
    notification.npc.id,
    notification.npc.name,
    npcType,
  );

  return `npc:${stableNpcId}`;
};

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
  if (!("npc" in notification) || !notification.npc) {
    return null;
  }

  const npcType = getDetectorNpcType(notification);
  const npcKey = getNotificationNpcMuteKey(notification);

  if (!npcKey || !npcType) {
    return null;
  }

  return {
    npcKey,
    npcId: getStableNpcId(notification.npc.id, notification.npc.name, npcType),
    name: notification.npc.name,
    npcType,
    lvl: Math.max(1, notification.npc.lvl),
    prof: notification.npc.prof ?? null,
    icon: notification.npc.icon ?? null,
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
