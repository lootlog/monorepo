import { Permission } from "@lootlog/types";
import type { GuildsControllerGetGuildPermissions200Item } from "@lootlog/api-client/models/main/guilds-controller-get-guild-permissions200-item";

export const canManageGuild = (
  permissions:
    | readonly (Permission | GuildsControllerGetGuildPermissions200Item)[]
    | undefined,
) => {
  return Boolean(
    permissions?.includes("ADMIN") || permissions?.includes("OWNER"),
  );
};
