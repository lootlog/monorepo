import type { AdminUser } from "@lootlog/client/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { Link } from "@tanstack/react-router";
import { RoleBadges } from "@/components/role-badges";
import { StatusBadge } from "@/components/status-badge";
import { UserTiles } from "@/components/user-tiles";
import { UserAvatar } from "@/components/user-avatar";
import { formatDate } from "@/lib/format";
import { text } from "@/lib/messages";

export function UsersTable({ users }: { users: ReadonlyArray<AdminUser> }) {
  if (users.length === 0)
    return (
      <p className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        {text.usersEmpty}
      </p>
    );

  return (
    <>
      <div className="md:hidden">
        <UserTiles users={users} />
      </div>
      <div className="hidden rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{text.columnUser}</TableHead>
              <TableHead>{text.columnRoles}</TableHead>
              <TableHead>{text.columnStatus}</TableHead>
              <TableHead className="text-right">
                {text.columnSessions}
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                {text.columnJoined}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Link
                    to="/users/$userId"
                    params={{ userId: user.id }}
                    className="flex min-w-0 items-center gap-3 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <UserAvatar name={user.name} image={user.image} />
                    <span className="grid min-w-0">
                      <span className="truncate font-medium underline-offset-4 hover:underline">
                        {user.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.discordId}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <RoleBadges roles={user.roles} />
                </TableCell>
                <TableCell>
                  <StatusBadge banned={user.ban !== null} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {user.activeSessions}
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {formatDate(user.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
