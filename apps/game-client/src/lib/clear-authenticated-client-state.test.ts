import { queryClient } from "@/lib/query-client";
import { useGlobalStore } from "@/store/global.store";
import { useBattleStore } from "@/store/game-store/battle.store";
import { clearAuthenticatedClientState } from "./clear-authenticated-client-state";

describe("clearAuthenticatedClientState", () => {
  it("removes private query data and resets the socket identity", () => {
    queryClient.setQueryData(["private-user-data"], { userId: "user-1" });
    useGlobalStore.getState().setSocketState({
      connected: true,
      joined: true,
      joinedGuilds: ["guild-1"],
    });
    useBattleStore.getState().setLastBattleHash("battle-hash");
    useBattleStore.getState().setLastKillHash("kill-hash");
    useBattleStore.getState().startBattle("battle-hash");
    useBattleStore.getState().updateBattleWarriors({
      player: { id: 1 } as never,
    });

    clearAuthenticatedClientState();

    expect(queryClient.getQueryData(["private-user-data"])).toBeUndefined();
    expect(useGlobalStore.getState().socketState).toEqual({
      connected: false,
      joined: false,
      joinedGuilds: [],
    });
    expect(useBattleStore.getState()).toMatchObject({
      battleState: "idle",
      battleWarriors: {},
      events: [],
      lastBattleHash: "",
      lastKillHash: "",
    });
  });
});
