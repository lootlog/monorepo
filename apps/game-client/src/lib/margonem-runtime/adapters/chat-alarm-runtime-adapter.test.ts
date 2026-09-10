import { afterEach, describe, expect, it } from "vitest";
import { getChatAlarmLocation } from "./chat-alarm-runtime-adapter";
import { seedRuntimeOthers } from "@/test/runtime-other-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useGameStore } from "@/store/game.store";
import { useOthersStore } from "@/store/others.store";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";

const player = (id: string, relation: number) => ({
  d: { id, relation, account: 1, icon: "", lvl: 100, prof: "w", nick: id },
});

afterEach(() => {
  useGameStore.setState(useGameStore.getInitialState());
  useOthersStore.setState(useOthersStore.getInitialState());
  runtimeOtherHandles.clear();
});

describe("chat alarm runtime", () => {
  it("counts current personal and clan enemies, reflecting in-place relation changes", () => {
    setTestRuntimeGame();
    const other = player("1", 3);
    seedRuntimeOthers({
      "1": other,
      duplicate: other,
      "2": player("2", 6),
      "3": player("3", 8),
      "4": player("4", 2),
    });
    expect(getChatAlarmLocation()).toEqual({
      map: "Ithan",
      x: 1,
      y: 2,
      enemyCount: 2,
    });
    other.d.relation = 2;
    expect(getChatAlarmLocation()?.enemyCount).toBe(1);
  });
  it("omits enemy count during a map transition instead of reporting stale enemies or zero", () => {
    setTestRuntimeGame();
    seedRuntimeOthers({ "1": player("1", 3) });
    useOthersStore.getState().clearOthers(true);
    expect(getChatAlarmLocation()?.enemyCount).toBeUndefined();
    useGameStore.getState().clearGame();
    expect(getChatAlarmLocation()).toBeNull();
  });
});
