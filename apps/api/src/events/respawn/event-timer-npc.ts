import { isObjectRecord } from "@lootlog/schema/records";

/** Project the display fields from a stored timer NPC, retaining legacy fallbacks. */
export const extractEventTimerNpc = (npcData: unknown) => {
  if (!isObjectRecord(npcData)) return { name: "", icon: null };
  return {
    name: typeof npcData.name === "string" ? npcData.name : "",
    icon: typeof npcData.icon === "string" ? npcData.icon : null,
  };
};
