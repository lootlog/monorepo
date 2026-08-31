import type { Role, Permission } from "#src/db/domain";

export type ChatMessageViewer = {
  discordId: string;
  permissions: Permission[];
  roles: Role[];
};
