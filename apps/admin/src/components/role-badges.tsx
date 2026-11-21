import type { PlatformRole } from "@lootlog/schema/platform-roles";
import { Badge } from "@lootlog/ui/components/badge";
import { roleText, text } from "@/lib/messages";

/** The roles a User holds, or a muted note when they hold none. */
export function RoleBadges({ roles }: { roles: ReadonlyArray<PlatformRole> }) {
  if (roles.length === 0)
    return (
      <span className="text-sm text-muted-foreground">{text.noRoles}</span>
    );

  return (
    <ul className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <li key={role}>
          <Badge variant={role === "admin" ? "alert" : "secondary"}>
            {roleText[role].name}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
