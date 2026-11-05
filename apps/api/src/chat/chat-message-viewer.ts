import type { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/organization.schema";

type Role = typeof roleTable.$inferSelect;

export type ChatMessageViewer = {
  readonly discordId: string;
  readonly permissions: ReadonlyArray<Permission>;
  readonly roles: ReadonlyArray<Role>;
};
