import type {
  eventHeroNpcTable,
  eventTable,
} from "#src/database/drizzle/schema";
import { ActiveEventHeroRepository } from "../services/active-event-hero.repository.js";

export type ActiveEventHeroMatch = {
  eventHero: typeof eventHeroNpcTable.$inferSelect;
  event: typeof eventTable.$inferSelect;
};

export async function findActiveEventHeroesByNpc(
  repository: ActiveEventHeroRepository,
  guildId: string,
  world: string,
  npcId: number,
  npcName: string,
): Promise<ActiveEventHeroMatch[]> {
  const now = new Date();

  const matches = await repository.findMatches(
    guildId,
    world,
    npcId,
    npcName,
    now,
  );
  return matches.sort((leftHero, rightHero) => {
    const leftStart =
      leftHero.event.startsAt?.getTime() ??
      leftHero.event.createdAt?.getTime?.() ??
      0;
    const rightStart =
      rightHero.event.startsAt?.getTime() ??
      rightHero.event.createdAt?.getTime?.() ??
      0;

    return rightStart - leftStart;
  });
}
