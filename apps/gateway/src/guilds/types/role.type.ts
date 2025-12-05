import { Permission } from '@lootlog/types';

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
