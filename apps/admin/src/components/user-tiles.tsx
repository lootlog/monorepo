import type { AdminUser } from "@lootlog/schema/admin";
import { Link } from "@tanstack/react-router";
import { RoleBadges } from "@/components/role-badges";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { RESULT_TILE_LINK_CLASS, RESULT_TILES_CLASS } from "@/lib/list-classes";

export function UserTiles({ users }: { users: ReadonlyArray<AdminUser> }) {
  return (
    <ul className={RESULT_TILES_CLASS}>
      {users.map((user) => (
        <li key={user.id}>
          <Link
            to="/users/$userId"
            params={{ userId: user.id }}
            className={RESULT_TILE_LINK_CLASS}
          >
            <span className="flex min-w-0 items-center gap-3">
              <UserAvatar name={user.name} image={user.image} />
              <span className="grid min-w-0 flex-1">
                <span className="truncate text-sm font-medium">
                  {user.name}
                </span>
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
