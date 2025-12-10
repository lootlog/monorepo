import { cn } from "@lootlog/ui/lib/utils";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import type { Member } from "../hooks/queries/use-events";

interface MemberNameProps {
  member: Member;
  className?: string;
}

export const MemberName = ({ member, className }: MemberNameProps) => {
  const color = useMemberColor(member);
  return (
    <span
      className={cn("text-sm text-muted-foreground truncate", className)}
      style={{ color }}
    >
      {member.name}
    </span>
  );
};
