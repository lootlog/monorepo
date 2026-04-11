import { Permission } from "@lootlog/types";

export const canManageGuild = (permissions: Permission[] | undefined) => {
  return Boolean(
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER),
  );
};
