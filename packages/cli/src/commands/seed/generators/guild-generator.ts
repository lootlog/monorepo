import { generate } from "random-words";
import crypto from "crypto";
import { v7 as uuidv7 } from "uuid";
import { SEED_CONFIG } from "../config.js";
import type { Permission } from "../../../../../apps/api/generated/client/index.js";

export interface GeneratedRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: Permission[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
}

export interface GeneratedMember {
  userId: string;
  name: string;
  avatar?: string;
  roleIds: string[];
  active: boolean;
}

export interface GeneratedGuild {
  id: string;
  name: string;
  icon?: string;
  ownerId: string;
  vanityUrl?: string;
  active: boolean;
  roles: GeneratedRole[];
  members: GeneratedMember[];
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  "ADMIN",
  "LOOTLOG_MANAGE",
  "LOOTLOG_READ",
  "LOOTLOG_WRITE",
  "LOOTLOG_READ_TIMERS_TITANS",
  "LOOTLOG_READ_LOOTS_TITANS",
  "LOOTLOG_READ_TIMERS_HEROES",
  "LOOTLOG_READ_LOOTS_HEROES",
  "LOOTLOG_CHAT_READ",
  "LOOTLOG_CHAT_WRITE",
  "LOOTLOG_NOTIFICATIONS_SEND",
  "LOOTLOG_NOTIFICATIONS_READ",
];

const ROLE_COLORS = [
  0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff8800,
  0x8800ff, 0x00ff88, 0xff0088, 0x88ff00, 0x0088ff,
];

export class GuildGenerator {
  generateRole(position: number): GeneratedRole {
    const id = uuidv7();
    const name = generate({ exactly: 2, join: " " });
    const color = ROLE_COLORS[crypto.randomInt(0, ROLE_COLORS.length)];

    const permissionCount = crypto.randomInt(1, 6);
    const permissions: Permission[] = [];

    for (let i = 0; i < permissionCount; i++) {
      const perm =
        AVAILABLE_PERMISSIONS[
          crypto.randomInt(0, AVAILABLE_PERMISSIONS.length)
        ];
      if (!permissions.includes(perm)) {
        permissions.push(perm);
      }
    }

    const lvlRangeFrom = crypto.randomInt(0, 150);
    const lvlRangeTo = crypto.randomInt(lvlRangeFrom + 50, 301);

    return {
      id,
      name,
      color,
      position,
      permissions,
      lvlRangeFrom,
      lvlRangeTo,
    };
  }

  generateMember(availableRoleIds: string[]): GeneratedMember {
    const userId = uuidv7();
    const name = generate({ exactly: crypto.randomInt(1, 4), join: " " });

    const roleCount = crypto.randomInt(
      0,
      Math.min(3, availableRoleIds.length + 1),
    );
    const roleIds: string[] = [];

    for (let i = 0; i < roleCount; i++) {
      const roleId =
        availableRoleIds[crypto.randomInt(0, availableRoleIds.length)];
      if (!roleIds.includes(roleId)) {
        roleIds.push(roleId);
      }
    }

    return {
      userId,
      name,
      avatar:
        crypto.randomInt(0, 10) > 7
          ? `/avatars/${crypto.randomInt(1, 100)}.png`
          : undefined,
      roleIds,
      active: crypto.randomInt(0, 10) > 1,
    };
  }

  generate(): GeneratedGuild {
    const { rolesPerGuild, membersPerGuild } = SEED_CONFIG.guilds;

    const id = uuidv7();
    const name = generate({ exactly: crypto.randomInt(2, 4), join: " " });
    const ownerId = uuidv7();
    const vanityUrl =
      crypto.randomInt(0, 10) > 5 ? generate({ exactly: 1 })[0] : undefined;

    const roleCount = crypto.randomInt(
      rolesPerGuild.min,
      rolesPerGuild.max + 1,
    );
    const roles = Array.from({ length: roleCount }, (_, i) =>
      this.generateRole(i),
    );

    const memberCount = crypto.randomInt(
      membersPerGuild.min,
      membersPerGuild.max + 1,
    );
    const roleIds = roles.map((r) => r.id);
    const members = Array.from({ length: memberCount }, () =>
      this.generateMember(roleIds),
    );

    const owner = this.generateMember(roleIds);
    owner.userId = ownerId;

    return {
      id,
      name,
      icon:
        crypto.randomInt(0, 10) > 7
          ? `/icons/${crypto.randomInt(1, 100)}.png`
          : undefined,
      ownerId,
      vanityUrl,
      active: true,
      roles,
      members: [owner, ...members],
    };
  }

  generateMultiple(count: number): GeneratedGuild[] {
    return Array.from({ length: count }, () => this.generate());
  }
}
