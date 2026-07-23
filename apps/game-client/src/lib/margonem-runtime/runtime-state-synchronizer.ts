import { useGameStore } from "@/store/game.store";
import { useNpcsStore } from "@/store/npcs.store";
import { usePartyStore } from "@/store/party.store";
import { useFriendsStore } from "@/store/friends.store";
import { useOthersStore } from "@/store/others.store";
import { parseFriendsListFromEvent } from "@/utils/game/events/parse-friends-list-from-event";
import type { RuntimeEventEnvelope } from "./runtime.types";
import {
  createRuntimeAdapter,
  type MargonemRuntimeAdapter,
} from "./runtime-adapter";
import {
  margonemRuntimeBridge,
  type MargonemRuntimeBridge,
} from "./margonem-runtime-bridge";
import { runtimeOtherHandles } from "./runtime-other-handles";

type Dependencies = {
  adapter: MargonemRuntimeAdapter;
  bridge: Pick<MargonemRuntimeBridge, "subscribeApplied">;
};

export class RuntimeStateSynchronizer {
  private readonly adapter: MargonemRuntimeAdapter;
  private readonly bridge: Dependencies["bridge"];
  private unsubscribe: (() => void) | null = null;

  constructor(dependencies?: Dependencies) {
    this.adapter = dependencies?.adapter ?? createRuntimeAdapter();
    this.bridge = dependencies?.bridge ?? margonemRuntimeBridge;
  }

  install(): void {
    this.cleanup();
    this.unsubscribe = this.bridge.subscribeApplied(this.reconcileAppliedEvent);
    this.bootstrap();
  }

  bootstrap(): boolean {
    try {
      const snapshot = this.adapter.getStateSnapshot();
      useGameStore.getState().replaceGame(snapshot.game);
      useNpcsStore.getState().replaceNpcs(snapshot.npcs);
      useOthersStore.getState().replaceOthers(snapshot.others);
      runtimeOtherHandles.replace(this.adapter.getAllOtherHandles());
      usePartyStore.getState().replaceParty(snapshot.party);
      useFriendsStore.getState().replaceFriends(snapshot.friends, 0);
      return true;
    } catch {
      useGameStore.getState().clearGame();
      useNpcsStore.getState().clearNpcs();
      usePartyStore.getState().clearParty();
      useFriendsStore.getState().clearFriends();
      useOthersStore.getState().clearOthers();
      runtimeOtherHandles.clear();
      return false;
    }
  }

  cleanup(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    useGameStore.getState().clearGame();
    useNpcsStore.getState().clearNpcs();
    usePartyStore.getState().clearParty();
    useFriendsStore.getState().clearFriends();
    useOthersStore.getState().clearOthers();
    runtimeOtherHandles.clear();
  }

  private readonly reconcileAppliedEvent = (
    envelope: RuntimeEventEnvelope,
  ): void => {
    const event = envelope.raw;
    if (!event) return;
    const mapChanged = event.town !== undefined;

    if (event.party !== undefined) {
      const members = Object.values(event.party.members ?? {}).map((member) =>
        Object.freeze({
          accountId: String(member.account),
          characterId: String(member.id),
          currentHp: 0,
          icon: member.icon,
          isLeader: member.commander === 1,
          maxHp: 0,
          name: member.nick,
          profession: null,
        }),
      );
      usePartyStore.getState().replaceParty(members);
    }

    if (event.friends !== undefined || event.friends_max !== undefined) {
      const current = useFriendsStore.getState();
      const friends = event.friends
        ? parseFriendsListFromEvent(event.friends).map((friend) =>
            Object.freeze({
              characterId: friend.characterId,
              icon: friend.icon,
              level: Number(friend.lvl),
              location: friend.location,
              name: friend.nick,
              profession: friend.prof,
              status: friend.status,
            }),
          )
        : current.friends;
      useFriendsStore
        .getState()
        .replaceFriends(friends, event.friends_max ?? current.friendsMax);
    }

    if (mapChanged) {
      try {
        useGameStore
          .getState()
          .replaceGame(this.adapter.getGameSnapshot(), true);
        useNpcsStore.getState().replaceNpcs(this.adapter.getAllNpcs(), true);
        useOthersStore
          .getState()
          .replaceOthers(this.adapter.getAllOthers(), true);
        runtimeOtherHandles.replace(this.adapter.getAllOtherHandles());
      } catch {
        useGameStore.getState().clearGame();
        useNpcsStore.getState().clearNpcs();
      }
      return;
    }

    if (event.h !== undefined) {
      try {
        useGameStore.getState().replaceGame(this.adapter.getGameSnapshot());
      } catch {
        // Keep the last coherent snapshot when a partial hero update is unavailable.
      }
    }

    if (event.other !== undefined) {
      const removeIds: string[] = [];
      const upserts = {} as Record<
        string,
        NonNullable<ReturnType<MargonemRuntimeAdapter["getOther"]>>
      >;
      const handleUpserts = {} as Record<
        string,
        NonNullable<ReturnType<MargonemRuntimeAdapter["getOtherHandle"]>>
      >;
      for (const otherId of Object.keys(event.other)) {
        const other = this.adapter.getOther(otherId);
        const handle = this.adapter.getOtherHandle(otherId);
        if (other && handle) {
          upserts[otherId] = other;
          handleUpserts[otherId] = handle;
        } else {
          removeIds.push(otherId);
        }
      }
      useOthersStore.getState().applyBatch({ removeIds, upserts });
      runtimeOtherHandles.applyBatch({ removeIds, upserts: handleUpserts });
    }

    const affectedIds = new Set<number>();
    for (const npc of event.npcs ?? []) affectedIds.add(npc.id);
    for (const npc of event.npcs_del ?? []) affectedIds.add(npc.id);
    if (affectedIds.size === 0) return;

    const removeIds: number[] = [];
    const upserts = [];
    for (const npcId of affectedIds) {
      const npc = this.adapter.getNpc(npcId);
      if (npc) upserts.push(npc);
      else removeIds.push(npcId);
    }
    useNpcsStore.getState().applyNpcBatch({ removeIds, upserts });
  };
}

export const runtimeStateSynchronizer = new RuntimeStateSynchronizer();
