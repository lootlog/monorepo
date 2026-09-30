import type { DiscordGuildChannelSnapshot } from "@lootlog/schema/notifications";

export const notificationChannelMetadata = (
  channel: Pick<
    DiscordGuildChannelSnapshot,
    | "channelType"
    | "requiredPermissions"
    | "grantedPermissions"
    | "missingPermissions"
    | "hasRequiredPermissions"
  >,
) => ({
  channelType: channel.channelType,
  requiredPermissions: channel.requiredPermissions,
  grantedPermissions: channel.grantedPermissions,
  missingPermissions: channel.missingPermissions,
  hasRequiredPermissions: channel.hasRequiredPermissions,
});
