import { useMemo } from "react";

type Role = { position: number; color: number };

export const useMemberColor = (guildMember: { roles?: Role[] } | undefined) =>
  useMemo(() => {
    if (!guildMember?.roles?.length) return "FFF";
    const topRole = guildMember.roles.reduce((prev: Role, curr: Role) =>
      curr.position > prev.position ? curr : prev
    );
    return topRole.color === 0 ? "FFF" : topRole.color?.toString(16);
  }, [guildMember]);
