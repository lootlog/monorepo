import type { FieldOutputTypes } from "../../prisma/contract.js";
import { and, or } from "@prisma/orm-family-sql/orm-client";
import { temporalToDate } from "#src/db/temporal";

type Event = FieldOutputTypes["public"]["Event"];
type EventHeroNpc = FieldOutputTypes["public"]["EventHeroNpc"];

export type ActiveEventHeroMatch = {
  eventHero: EventHeroNpc;
  event: Event;
};

export async function findActiveEventHeroesByNpc(
  prisma: { orm: any },
  guildId: string,
  world: string,
  npcId: number,
  npcName: string,
): Promise<ActiveEventHeroMatch[]> {
  const now = new Date();
  const activeEvent = (event: any) =>
    and(
      event.guildId.eq(guildId),
      event.world.eq(world),
      or(event.startsAt.isNull(), event.startsAt.lte(now)),
      or(event.endsAt.isNull(), event.endsAt.gt(now)),
    );
  const matches = await prisma.orm.public.EventHeroNpc.where((hero) =>
    and(
      hero.event.some(activeEvent),
      or(hero.npcId.eq(npcId), hero.npcName.eq(npcName)),
    ),
  )
    .include("event")
    .all();
  const uniqueMatches = new Map<string, ActiveEventHeroMatch>();

  for (const hero of matches) {
    const event = hero.event;
    if (!event) {
      continue;
    }

    uniqueMatches.set(hero.id, {
      eventHero: {
        ...hero,
        ...(hero.createdAt && { createdAt: temporalToDate(hero.createdAt) }),
      } as EventHeroNpc,
      event: {
        ...event,
        ...(event.startsAt && { startsAt: temporalToDate(event.startsAt) }),
        ...(event.endsAt && { endsAt: temporalToDate(event.endsAt) }),
        ...(event.createdAt && { createdAt: temporalToDate(event.createdAt) }),
        ...(event.updatedAt && { updatedAt: temporalToDate(event.updatedAt) }),
      } as Event,
    });
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
