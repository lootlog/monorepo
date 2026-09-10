import { isObjectRecord } from "@lootlog/schema/records";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { useGameStore } from "@/store/game.store";
import { useOthersStore } from "@/store/others.store";

export const getChatAlarmLocation = () => {
  const { game, status, mapEpoch } = useGameStore.getState();
  if (!game || status !== "ready") return null;
  const others = useOthersStore.getState();
  let enemyCount: number | undefined;
  if (others.status === "ready" && others.mapEpoch === mapEpoch) {
    const enemyIds = new Set<string>();
    // OthersManager owns current-map handles and mutates relation in place.
    // Count only known players; this is not a complete server map census.
    for (const [id, handle] of Object.entries(runtimeOtherHandles.getAll())) {
      const rawData = "d" in handle ? handle.d : handle;
      const data: unknown = rawData;
      if (!isObjectRecord(data)) continue;
      if (data.relation === 3 || data.relation === 6) {
        const characterId = String(rawData.id || id);
        enemyIds.add(characterId);
      }
    }
    enemyCount = enemyIds.size;
  }
  return { map: game.map.name, x: game.hero.x, y: game.hero.y, enemyCount };
};
