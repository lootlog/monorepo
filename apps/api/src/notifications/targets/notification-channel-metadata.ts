import type { DiscordGuildChannel } from "@lootlog/schema/discord";

export const notificationChannelMetadata = (
  channel: Pick<
    DiscordGuildChannel,
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
