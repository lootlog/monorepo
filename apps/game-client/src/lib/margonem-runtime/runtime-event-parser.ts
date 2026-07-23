import type { GameEvent } from "@lootlog/margonem/game-events";
import type { RuntimeFact } from "./runtime.types";

export function parseRuntimeFacts(event: GameEvent): readonly RuntimeFact[] {
  const facts: RuntimeFact[] = [];
  const add = (kind: RuntimeFact["kind"], present: boolean) => {
    if (present) facts.push(Object.freeze({ event, kind }));
  };

  add("chat", event.chat !== undefined);
  add("dialog", event.d !== undefined);
  add("battle", event.f !== undefined);
  add("map", event.town !== undefined);
  add("npc-upsert", event.npcs !== undefined);
  add("loot", event.item !== undefined && event.loot !== undefined);
  add("npc-delete", event.npcs_del !== undefined);
  add("other", event.other !== undefined);
  add("afk", event.h !== undefined);
  add(
    "friends",
    event.friends !== undefined || event.friends_max !== undefined,
  );
  add("party", event.party !== undefined);

  return Object.freeze(facts);
}
