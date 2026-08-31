import { and } from "@prisma/orm-family-sql/orm-client";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Permission, Role } from "#src/db/domain";
import { PrismaService } from "#src/db/prisma.service";
import { filterHeroesByLevel } from "#src/shared/utils/can-view-event-hero";

@Injectable()
export class EventAccessService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
  ) {
    const event = await this.prisma.db.orm.public.Event.where((row) =>
      and(row.id.eq(eventId), row.guildId.eq(guildId)),
    ).first();
    const hero = event
      ? await this.prisma.db.orm.public.EventHeroNpc.where((row) =>
          and(row.id.eq(heroId), row.eventId.eq(eventId)),
        ).first()
      : null;

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
    const event = await this.prisma.db.orm.public.Event.where((row) =>
      and(row.id.eq(eventId), row.guildId.eq(guildId)),
    ).first();
    const map = event
      ? await this.prisma.db.orm.public.EventMap.where((row) =>
          row.id.eq(mapId),
        ).first()
      : null;
    const hero = map
      ? await this.prisma.db.orm.public.EventHeroNpc.where((row) =>
          and(row.id.eq(map.heroNpcId), row.eventId.eq(eventId)),
        ).first()
      : null;

    if (!map || !hero || !this.isHeroVisibleToUser(hero, roles, permissions)) {
      throw new NotFoundException("Map not found");
    }

    return { ...map, heroNpc: hero };
  }
}
