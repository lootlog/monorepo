import type { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";

type Role = typeof roleTable.$inferSelect;

export type ChatMessageViewer = {
  discordId: string;
  permissions: Permission[];
  roles: Role[];
};
