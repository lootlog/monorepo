import { Permission } from 'src/guilds/enum/permission.type';

export type Role = {
  id: string;
  guildId: string;
  name: string;
  color: number | null;
  position: number | null;
  permissions: Permission[];
  lvlRangeFrom: number | null;
  lvlRangeTo: number | null;
  createdAt: Date;
  updatedAt: Date;
};
