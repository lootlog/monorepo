import { useMemo } from "react";

type Role = { position: number; color: number | null };

export const useMemberColor = (guildMember: { roles?: Role[] } | undefined) =>
  useMemo(() => {
    if (!guildMember?.roles?.length) return "inherit";
    const topRole = guildMember.roles.reduce((prev: Role, curr: Role) =>
      (curr.position || 0) > (prev.position || 0) ? curr : prev,
    );
    return topRole.color === 0 || !topRole.color
      ? "inherit"
      : `#${topRole.color.toString(16).padStart(6, "0")}`;
  }, [guildMember]);
