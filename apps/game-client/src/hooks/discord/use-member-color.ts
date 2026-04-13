import { useMemo } from "react";

type Role = { position: number | null; color: number | null };

export const useMemberColor = (
  guildMember:
    | {
        color?: number | null;
        roles?: Role[];
      }
    | undefined,
) =>
  useMemo(() => {
    if (guildMember?.color !== undefined && guildMember.color !== null) {
      return guildMember.color === 0
        ? "FFF"
        : guildMember.color.toString(16).padStart(6, "0");
    }

    if (!guildMember?.roles?.length) return "FFF";

    const topRole = guildMember.roles.reduce((prev: Role, curr: Role) =>
      (curr.position ?? 0) > (prev.position ?? 0) ? curr : prev,
    );

    return topRole.color === 0
      ? "FFF"
      : topRole.color?.toString(16).padStart(6, "0");
  }, [guildMember]);
