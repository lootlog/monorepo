import { formatDiscordColor } from "@/utils/format-discord-color";

type Role = { position: number | null; color: number | null };

export const useMemberColor = (
  guildMember:
    | {
        color?: number | null;
        roles?: Role[];
      }
    | undefined,
) => {
  if (guildMember?.color !== undefined && guildMember.color !== null) {
    return formatDiscordColor(guildMember.color);
  }

  if (!guildMember?.roles?.length) return "FFF";

  const topRole = guildMember.roles.reduce((prev: Role, curr: Role) =>
    (curr.position ?? 0) > (prev.position ?? 0) ? curr : prev,
  );

  return formatDiscordColor(topRole.color);
};
