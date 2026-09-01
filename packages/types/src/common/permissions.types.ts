import {
  Capability,
  type Capability as CapabilityName,
} from "@lootlog/access-policy";

export const Permission = Capability;
export type Permission = CapabilityName;

export interface UserGuildPermissionsRole {
  id: string;
  lvlRangeFrom: number;
  lvlRangeTo: number;
  permissions: Permission[];
}

export interface UserGuildPermissionsGuild {
  id: string;
  ownerId: string;
}

export interface UserGuildPermissionsDto {
  guild: UserGuildPermissionsGuild;
  roles: UserGuildPermissionsRole[];
}
