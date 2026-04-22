import type { Role, Permission } from "src/generated/prisma/client";

export type ChatMessageViewer = {
  discordId: string;
  permissions: Permission[];
  roles: Role[];
};
