import type { Event, EventHeroNpc } from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import { buildActiveEventWhere } from "./event-activity.util";

export type ActiveEventHeroMatch = {
  eventHero: EventHeroNpc;
  event: Event;
};

export async function findActiveEventHeroesByNpc(
  prisma: PrismaService,
  guildId: string,
  world: string,
  npcId: number,
  npcName: string,
): Promise<ActiveEventHeroMatch[]> {
  const now = new Date();

  const directIdMatches = await prisma.eventHeroNpc.findMany({
    where: {
      npcId,
      event: {
        guildId,
        world,
        ...buildActiveEventWhere(now),
      },
    },
    include: {
      event: true,
    },
  });

  const nameMatches = await prisma.eventHeroNpc.findMany({
    where: {
      npcName,
      event: {
        guildId,
        world,
        ...buildActiveEventWhere(now),
      },
    },
    include: {
      event: true,
    },
  });

  const uniqueMatches = new Map<string, ActiveEventHeroMatch>();

  for (const hero of [...directIdMatches, ...nameMatches]) {
    uniqueMatches.set(hero.id, { eventHero: hero, event: hero.event });
  }

  return Array.from(uniqueMatches.values()).sort((leftHero, rightHero) => {
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
