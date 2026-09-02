import { NotFoundException } from "#src/shared/http/http-errors";
import type { Permission } from "@lootlog/schema/permissions";
import type {
  eventHeroNpcTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { filterHeroesByLevel } from "#src/shared/utils/can-view-event-hero";
import { EventAccessRepository } from "./event-access.repository.js";
type EventHeroNpc = typeof eventHeroNpcTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;

export class EventAccessService {
  constructor(private readonly repository: EventAccessRepository) {}

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
    const hero = await this.repository.findHero(guildId, eventId, heroId);

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
    const map = await this.repository.findMap(guildId, eventId, mapId);

    if (!map || !this.isHeroVisibleToUser(map.heroNpc, roles, permissions)) {
      throw new NotFoundException("Map not found");
    }

    return map;
  }
}
