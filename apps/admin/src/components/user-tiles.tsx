import type { AdminUser } from "@lootlog/client/auth";
import { Link } from "@tanstack/react-router";
import { RoleBadges } from "@/components/role-badges";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";

export function UserTiles({ users }: { users: ReadonlyArray<AdminUser> }) {
  return (
    <ul className="flex flex-col gap-2">
      {users.map((user) => (
        <li key={user.id}>
          <Link
            to="/users/$userId"
            params={{ userId: user.id }}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex min-w-0 items-center gap-3">
              <UserAvatar name={user.name} image={user.image} />
              <span className="grid min-w-0 flex-1">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.discordId}
                </span>
              </span>
              <StatusBadge banned={user.ban !== null} />
            </span>
            {user.roles.length > 0 ? <RoleBadges roles={user.roles} /> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
