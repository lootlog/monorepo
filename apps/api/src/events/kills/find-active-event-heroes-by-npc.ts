import type { ActiveEventHeroStore } from "#src/events/kills/active-event-hero.repository";
import { Effect } from "effect";

// Margonem has renamed NPCs mid-event (Doppelgänger became Doppelganger), so a
// hero typed with the old spelling must still match until it learns the NPC id.
// A hero that already knows a different NPC id is another NPC.
const comparableNpcName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export function findActiveEventHeroesByNpc(
  repository: ActiveEventHeroStore,
  guildId: string,
  world: string,
  npcId: number,
  npcName: string,
) {
  const now = new Date();
  const killedName = comparableNpcName(npcName);

  return repository.findActiveHeroes(guildId, world, now).pipe(
    Effect.map((heroes) =>
      heroes
        .filter(
          ({ eventHero }) =>
            eventHero.npcId === npcId ||
            eventHero.npcName === npcName ||
            (eventHero.npcId === null &&
              comparableNpcName(eventHero.npcName) === killedName),
        )
        .sort((leftHero, rightHero) => {
          const leftStart =
            leftHero.event.startsAt?.getTime() ??
            leftHero.event.createdAt?.getTime?.() ??
            0;

          const rightStart =
            rightHero.event.startsAt?.getTime() ??
            rightHero.event.createdAt?.getTime?.() ??
            0;

          return rightStart - leftStart;
        }),
    ),
  );
}
