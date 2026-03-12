import { Injectable, NotFoundException } from "@nestjs/common";
import { EventHeroNpc, Permission, type Role } from "generated/client";
import { PrismaService } from "src/db/prisma.service";
import { filterHeroesByLevel } from "src/shared/utils/can-view-event-hero";

@Injectable()
export class EventAccessService {
  constructor(private readonly prisma: PrismaService) {}

  filterEventHeroesByLevel<
    T extends { heroNpcs: Array<{ npcLvl: number | null }> },
  >(event: T, roles: Role[], permissions: Permission[]): T {
    return {
      ...event,
      heroNpcs: filterHeroesByLevel(event.heroNpcs, roles, permissions),
    };
  }

  filterEventsHeroesByLevel<
    T extends { heroNpcs: Array<{ npcLvl: number | null }> },
  >(events: T[], roles: Role[], permissions: Permission[]): T[] {
    return events.map((event) =>
      this.filterEventHeroesByLevel(event, roles, permissions),
    );
  }

  isHeroVisibleToUser(
    hero: { npcLvl: number | null },
    roles: Role[],
    permissions: Permission[],
  ): boolean {
    return filterHeroesByLevel([hero], roles, permissions).length > 0;
  }

  async getHeroWithAccessCheck(
    guildId: string,
    eventId: string,
    heroId: string,
    roles: Role[],
    permissions: Permission[],
  ): Promise<EventHeroNpc> {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero || !this.isHeroVisibleToUser(hero, roles, permissions)) {
      throw new NotFoundException("Hero not found");
    }

    return hero;
  }

  async getMapWithHeroAccessCheck(
    guildId: string,
    eventId: string,
    mapId: string,
    roles: Role[],
    permissions: Permission[],
  ) {
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpc: {
          eventId,
          event: { guildId },
        },
      },
      include: {
        heroNpc: true,
      },
    });

    if (!map || !this.isHeroVisibleToUser(map.heroNpc, roles, permissions)) {
      throw new NotFoundException("Map not found");
    }

    return map;
  }
}
