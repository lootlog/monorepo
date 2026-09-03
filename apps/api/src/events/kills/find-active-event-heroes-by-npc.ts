import type {
  eventHeroNpcTable,
  eventTable,
} from "#src/database/drizzle/schema";
import type { ActiveEventHeroStore } from "#src/events/kills/active-event-hero.repository";
import { Effect } from "effect";

export type ActiveEventHeroMatch = {
  eventHero: typeof eventHeroNpcTable.$inferSelect;
  event: typeof eventTable.$inferSelect;
};

export function findActiveEventHeroesByNpc(
  repository: ActiveEventHeroStore,
  guildId: string,
  world: string,
  npcId: number,
  npcName: string,
) {
  const now = new Date();

  return repository.findMatches(guildId, world, npcId, npcName, now).pipe(
    Effect.map((matches) =>
      matches.sort((leftHero, rightHero) => {
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
