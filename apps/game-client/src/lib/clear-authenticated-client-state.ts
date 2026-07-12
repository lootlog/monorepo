import { queryClient } from "@/lib/query-client";
import { useChatStore } from "@/store/chat.store";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useLootStore } from "@/store/game-store/loot.store";
import { useGlobalStore } from "@/store/global.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";

export const clearAuthenticatedClientState = () => {
  queryClient.clear();
  useGlobalStore.getState().setSocketState({
    connected: false,
    joined: false,
    joinedGuilds: [],
  });
  useChatStore.getState().clearReplyDraft();
  const battleStore = useBattleStore.getState();
  battleStore.clearEvents();
  battleStore.endBattle();
  battleStore.setLastBattleHash("");
  battleStore.setLastKillHash("");
  battleStore.updateBattleWarriors(null);
  useLootStore.getState().setLastLootId(null);
  useNotificationsStore.getState().clearNotifications();
  useNpcDetectorStore.getState().clearNpcs();
  useOnlineCharacterOwnersStore.getState().clearOwners();
  useOthersStore.getState().clearOthers();
  usePartyFinderStore.getState().clearPartyFinder();
  usePartyStore.getState().clearParty();
};
