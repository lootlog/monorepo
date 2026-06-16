type Role = { position: number; color?: number | null };

export const useMemberColor = (guildMember: { roles?: Role[] } | undefined) => {
  if (!guildMember?.roles?.length) return "inherit";

  const topRole = guildMember.roles.reduce((prev, curr) =>
    curr.position > prev.position ? curr : prev,
  );

  return !topRole.color
    ? "inherit"
    : `#${topRole.color.toString(16).padStart(6, "0")}`;
};
