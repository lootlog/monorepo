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
import {
  measurePerformance,
  runWithPerformanceContext,
} from "@/lib/performance-monitoring/performance-monitor";

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
    this.unsubscribe = this.bridge.subscribeApplied(
      this.reconcileAppliedEvent,
      "runtime-state-synchronizer",
    );
    this.bootstrap();
  }

  bootstrap(): boolean {
    return measurePerformance(
      "runtime.sync.bootstrap",
      "runtime-synchronizer",
      undefined,
      () => {
        try {
          const snapshot = this.adapter.getStateSnapshot();
          const otherHandles = this.adapter.getAllOtherHandles();
          this.measureDomain("game", "replace", () =>
            useGameStore.getState().replaceGame(snapshot.game),
          );
          this.measureDomain("npcs", "replace", () =>
            useNpcsStore.getState().replaceNpcs(snapshot.npcs),
          );
          this.measureDomain("other-handles", "replace", () =>
            runtimeOtherHandles.replace(otherHandles),
          );
          this.measureDomain("others", "replace", () =>
            useOthersStore.getState().replaceOthers(snapshot.others),
          );
          this.measureDomain("party", "replace", () =>
            usePartyStore.getState().replaceParty(snapshot.party),
          );
          this.measureDomain("friends", "replace", () =>
            useFriendsStore.getState().replaceFriends(snapshot.friends, 0),
          );
          return true;
        } catch {
          this.clearAllDomains();
          return false;
        }
      },
    );
  }

  cleanup(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clearAllDomains();
  }

  private readonly reconcileAppliedEvent = (
    envelope: RuntimeEventEnvelope,
  ): void => {
    runWithPerformanceContext(`runtime-event-${envelope.sequence}`, () =>
      measurePerformance(
        "runtime.sync.reconcile",
        "runtime-synchronizer",
        { factCount: envelope.facts?.length ?? 0 },
        () => this.reconcileEnvelope(envelope),
      ),
    );
  };

  private reconcileEnvelope(envelope: RuntimeEventEnvelope): void {
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
      this.measureDomain("party", "event-replace", () =>
        usePartyStore.getState().replaceParty(members),
      );
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
      this.measureDomain("friends", "event-replace", () =>
        useFriendsStore
          .getState()
          .replaceFriends(friends, event.friends_max ?? current.friendsMax),
      );
    }

    if (mapChanged) {
      try {
        const game = this.adapter.getGameSnapshot();
        const npcs = this.adapter.getAllNpcs();
        const others = this.adapter.getAllOthers();
        const otherHandles = this.adapter.getAllOtherHandles();

        this.measureDomain("game", "map-replace", () =>
          useGameStore.getState().replaceGame(game, true),
        );
        this.measureDomain("npcs", "map-replace", () =>
          useNpcsStore.getState().replaceNpcs(npcs, true),
        );
        this.measureDomain("other-handles", "map-replace", () =>
          runtimeOtherHandles.replace(otherHandles),
        );
        this.measureDomain("others", "map-replace", () =>
          useOthersStore.getState().replaceOthers(others, true),
        );
      } catch {
        this.measureDomain("game", "map-clear", () =>
          useGameStore.getState().clearGame(true),
        );
        this.measureDomain("npcs", "map-clear", () =>
          useNpcsStore.getState().clearNpcs(true),
        );
        this.measureDomain("other-handles", "map-clear", () =>
          runtimeOtherHandles.clear(),
        );
        this.measureDomain("others", "map-clear", () =>
          useOthersStore.getState().clearOthers(true),
        );
      }
      return;
    }

    if (event.h !== undefined) {
      try {
        this.measureDomain("game", "hero-replace", () =>
          useGameStore.getState().replaceGame(this.adapter.getGameSnapshot()),
        );
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
      this.measureDomain("other-handles", "batch", () =>
        runtimeOtherHandles.applyBatch({ removeIds, upserts: handleUpserts }),
      );
      this.measureDomain("others", "batch", () =>
        useOthersStore.getState().applyBatch({ removeIds, upserts }),
      );
    }

    const affectedIds = new Set<number>();
    for (const npc of event.npcs ?? []) affectedIds.add(npc.id);
    for (const npc of event.npcs_del ?? []) affectedIds.add(npc.id);
    if (affectedIds.size === 0) return;

    const removeIds: number[] = [];
    const upserts: NonNullable<ReturnType<MargonemRuntimeAdapter["getNpc"]>>[] =
      [];
    for (const npcId of affectedIds) {
      const npc = this.adapter.getNpc(npcId);
      if (npc) upserts.push(npc);
      else removeIds.push(npcId);
    }
    this.measureDomain("npcs", "batch", () =>
      useNpcsStore.getState().applyNpcBatch({ removeIds, upserts }),
    );
  }

  private clearAllDomains(): void {
    this.measureDomain("game", "clear", () =>
      useGameStore.getState().clearGame(),
    );
    this.measureDomain("npcs", "clear", () =>
      useNpcsStore.getState().clearNpcs(),
    );
    this.measureDomain("party", "clear", () =>
      usePartyStore.getState().clearParty(),
    );
    this.measureDomain("friends", "clear", () =>
      useFriendsStore.getState().clearFriends(),
    );
    this.measureDomain("other-handles", "clear", () =>
      runtimeOtherHandles.clear(),
    );
    this.measureDomain("others", "clear", () =>
      useOthersStore.getState().clearOthers(),
    );
  }

  private measureDomain<Result>(
    domain: string,
    operation: string,
    callback: () => Result,
  ): Result {
    return measurePerformance(
      `runtime.sync.${domain}.${operation}`,
      "runtime-synchronizer",
      undefined,
      callback,
    );
  }
}

export const runtimeStateSynchronizer = new RuntimeStateSynchronizer();
