export const useMemberColor = (
  guildMember: { color?: number | null } | undefined,
) =>
  guildMember?.color ? guildMember.color.toString(16).padStart(6, "0") : "FFF";
