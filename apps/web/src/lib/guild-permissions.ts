import { Permission } from "@lootlog/types";
import type { GuildsControllerGetGuildPermissions200Item } from "@/lib/api/generated/main/model";

export const canManageGuild = (
  permissions:
    | readonly (Permission | GuildsControllerGetGuildPermissions200Item)[]
    | undefined,
) => {
  return Boolean(
    permissions?.includes("ADMIN") || permissions?.includes("OWNER"),
  );
};
