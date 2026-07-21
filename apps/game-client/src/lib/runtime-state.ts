import { disposeReadyRoomInvitationCoordinator } from "@/features/party-finder/ready-room-invitation-coordinator";
import { clearTimerEpochCache } from "@/features/timers/utils/timers-utils";
import { characterTooltipCatchingGuildsCoordinator } from "@/lib/character-tooltip-catching-guilds-coordinator";
import { characterTooltipTransforms } from "@/lib/margonem-tooltips/registry";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useChatStore } from "@/store/chat.store";
import { useFriendsStore } from "@/store/friends.store";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { useLootStore } from "@/store/game-store/loot.store";
import { useGlobalStore } from "@/store/global.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";
import { disposeTimerSettingsSync } from "@/store/timer-settings-sync";

export function resetTransientRuntimeState(): void {
  disposeReadyRoomInvitationCoordinator();
  characterTooltipCatchingGuildsCoordinator.dispose();
  characterTooltipTransforms.clear();
  clearTimerEpochCache();
  disposeTimerSettingsSync();
  useCharacterTooltipCatchingGuildsStore.getState().clear();
  useNotificationsStore.getState().clearNotifications();
  useNpcDetectorStore.getState().clearNpcs();
  useOnlineCharacterOwnersStore.getState().clearOwners();
  useOthersStore.getState().clearOthers();
  usePartyFinderStore.getState().clearReadyRooms();
  usePartyStore.getState().clearParty();

  const battleStore = useBattleStore.getState();
  battleStore.clearEvents();
  useBattleStore.setState({
    battleState: "idle",
    battleWarriors: {},
    lastBattleHash: "",
    lastKillHash: "",
  });
  useDialogStore.getState().setTalkingNpcId(null);
  useLootStore.getState().setLastLootId(null);
  useFriendsStore.setState({ friends: [], friendsMax: 0 });

  if (useChatStore.getState().replyDraft) {
    useChatStore.getState().clearReplyDraft();
  }

  useGlobalStore.setState({
    gameState: { gameInitialized: false },
    socketState: { connected: false, joined: false, joinedGuilds: [] },
  });
}
