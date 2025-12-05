import { canViewNpcTimer } from './can-view-npc-timer';
import { NpcType } from '../enums/npc-type.enum';
import { Permission } from '@lootlog/types';
import type { Npc } from '../types/npc.type';
import type { Role } from '../../guilds/types/role.type';

describe('canViewNpcTimer', () => {
  const createNpc = (type: NpcType, lvl: number): Npc => ({
    id: 1,
    name: 'Test NPC',
    lvl,
    prof: 'warrior',
    type,
    margonemType: '1',
    location: 'test-location',
    wt: '1000',
    icon: 'icon.png',
    createdAt: new Date(),
    updatedAt: new Date(),
    lootId: null,
    x: 15,
    y: 15,
  });

  const createRole = (
    permissions: Permission[],
    lvlRangeFrom: number,
    lvlRangeTo: number,
  ): Role => ({
    id: 'role-id',
    guildId: 'guild-id',
    name: 'Test Role',
    color: null,
    position: null,
    permissions,
    lvlRangeFrom,
    lvlRangeTo,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('TITAN NPCs', () => {
    it('should return true when user has TITAN permission and correct level range', () => {
      const npc = createNpc(NpcType.TITAN, 100);
      const roles = [
        createRole([Permission.LOOTLOG_TIMERS_TITANS_READ], 50, 150),
      ];

      expect(canViewNpcTimer(npc, roles)).toBe(true);
    });

    it('should return false when user has TITAN permission but wrong level range', () => {
      const npc = createNpc(NpcType.TITAN, 200);
      const roles = [
        createRole([Permission.LOOTLOG_TIMERS_TITANS_READ], 50, 150),
      ];

      expect(canViewNpcTimer(npc, roles)).toBe(false);
    });

    it('should return false when user lacks TITAN permission', () => {
      const npc = createNpc(NpcType.TITAN, 100);
      const roles = [createRole([Permission.LOOTLOG_TIMERS_READ], 50, 150)];

      expect(canViewNpcTimer(npc, roles)).toBe(false);
    });

    it('should return true when level exactly matches range boundary', () => {
      const npc = createNpc(NpcType.TITAN, 100);
      const roles = [
        createRole([Permission.LOOTLOG_TIMERS_TITANS_READ], 100, 200),
      ];

      expect(canViewNpcTimer(npc, roles)).toBe(true);
    });

    it('should return true when user has multiple roles with one matching', () => {
      const npc = createNpc(NpcType.TITAN, 100);
      const roles = [
        createRole([Permission.LOOTLOG_TIMERS_TITANS_READ], 1, 50),
        createRole([Permission.LOOTLOG_TIMERS_TITANS_READ], 50, 150),
      ];

      expect(canViewNpcTimer(npc, roles)).toBe(true);
    });
  });

  describe('HERO and EVENT_HERO NPCs', () => {
    it('should return true for HERO with correct permissions and level', () => {
      const npc = createNpc(NpcType.HERO, 200);
      const roles = [
        createRole([Permission.LOOTLOG_TIMERS_HEROES_READ], 150, 250),
      ];

      expect(canViewNpcTimer(npc, roles)).toBe(true);
    });

    it('should return true for EVENT_HERO with correct permissions and level', () => {
      const npc = createNpc(NpcType.EVENT_HERO, 200);
      const roles = [
        createRole([Permission.LOOTLOG_TIMERS_HEROES_READ], 150, 250),
      ];

      expect(canViewNpcTimer(npc, roles)).toBe(true);
    });

    it('should return false when user has HERO permission but wrong level', () => {
      const npc = createNpc(NpcType.HERO, 300);
      const roles = [
        createRole([Permission.LOOTLOG_TIMERS_HEROES_READ], 150, 250),
      ];

      expect(canViewNpcTimer(npc, roles)).toBe(false);
    });

    it('should return false when user lacks HERO permission', () => {
      const npc = createNpc(NpcType.HERO, 200);
      const roles = [createRole([Permission.LOOTLOG_TIMERS_READ], 150, 250)];

      expect(canViewNpcTimer(npc, roles)).toBe(false);
    });
  });

  describe('Other NPC types (COMMON, ELITE, etc)', () => {
    it('should return true for COMMON NPC with LOOTLOG_READ permission', () => {
      const npc = createNpc(NpcType.COMMON, 50);
      const roles = [createRole([Permission.LOOTLOG_TIMERS_READ], 1, 100)];

      expect(canViewNpcTimer(npc, roles)).toBe(true);
    });

    it('should return true for ELITE NPC with correct level range', () => {
      const npc = createNpc(NpcType.ELITE, 75);
      const roles = [createRole([Permission.LOOTLOG_TIMERS_READ], 50, 100)];

      expect(canViewNpcTimer(npc, roles)).toBe(true);
    });

    it('should return false when level is outside range', () => {
      const npc = createNpc(NpcType.ELITE, 150);
      const roles = [createRole([Permission.LOOTLOG_TIMERS_READ], 50, 100)];

      expect(canViewNpcTimer(npc, roles)).toBe(false);
    });

    it('should return false when lacking LOOTLOG_READ permission', () => {
      const npc = createNpc(NpcType.COMMON, 50);
      const roles = [createRole([Permission.LOOTLOG_CHAT_READ], 1, 100)];

      expect(canViewNpcTimer(npc, roles)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should return false when npc is null', () => {
      const roles = [createRole([Permission.LOOTLOG_TIMERS_READ], 1, 999)];

      expect(canViewNpcTimer(null, roles)).toBe(false);
    });

    it('should return false when npc is undefined', () => {
      const roles = [createRole([Permission.LOOTLOG_TIMERS_READ], 1, 999)];

      expect(canViewNpcTimer(undefined, roles)).toBe(false);
    });

    it('should return false when roles array is empty', () => {
      const npc = createNpc(NpcType.COMMON, 50);

      expect(canViewNpcTimer(npc, [])).toBe(false);
    });

    it('should return false when no role permissions match', () => {
      const npc = createNpc(NpcType.COMMON, 50);
      const roles = [
        createRole([Permission.LOOTLOG_CHAT_READ], 1, 100),
        createRole([Permission.LOOTLOG_CHAT_WRITE], 1, 100),
      ];

      expect(canViewNpcTimer(npc, roles)).toBe(false);
    });
  });

  describe('Complex permission scenarios', () => {
    it('should handle user with both general and specific permissions', () => {
      const npc = createNpc(NpcType.TITAN, 100);
      const roles = [
        createRole([Permission.LOOTLOG_TIMERS_READ], 1, 50),
        createRole([Permission.LOOTLOG_TIMERS_TITANS_READ], 80, 120),
      ];

      expect(canViewNpcTimer(npc, roles)).toBe(true);
    });

    it('should prioritize specific TITAN permissions over general', () => {
      const npc = createNpc(NpcType.TITAN, 100);
      const roles = [
        createRole([Permission.LOOTLOG_TIMERS_READ], 50, 150),
        createRole([Permission.LOOTLOG_TIMERS_TITANS_READ], 1, 50),
      ];

      expect(canViewNpcTimer(npc, roles)).toBe(false);
    });

    it('should handle multiple roles with non-overlapping ranges', () => {
      const npc = createNpc(NpcType.HERO, 85);
      const roles = [
        createRole([Permission.LOOTLOG_TIMERS_HEROES_READ], 1, 80),
        createRole([Permission.LOOTLOG_TIMERS_HEROES_READ], 90, 200),
      ];

      expect(canViewNpcTimer(npc, roles)).toBe(false);
    });

    it('should handle roles with multiple permissions', () => {
      const npc = createNpc(NpcType.TITAN, 100);
      const roles = [
        createRole(
          [
            Permission.LOOTLOG_TIMERS_READ,
            Permission.LOOTLOG_TIMERS_TITANS_READ,
            Permission.LOOTLOG_TIMERS_WRITE,
          ],
          50,
          150,
        ),
      ];

      expect(canViewNpcTimer(npc, roles)).toBe(true);
    });
  });
});
