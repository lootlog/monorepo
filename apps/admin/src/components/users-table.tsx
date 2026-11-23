import type { AdminUser } from "@lootlog/schema/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { RoleBadges } from "@/components/role-badges";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { UserTiles } from "@/components/user-tiles";
import { formatDate } from "@/lib/format";
import { RESULT_NAME_LINK_CLASS, RESULT_TABLE_CLASS } from "@/lib/list-classes";
import { text } from "@/lib/messages";

export function UsersTable({
  users,
  empty,
}: {
  users: ReadonlyArray<AdminUser>;
  empty: ReactNode;
}) {
  if (users.length === 0) return empty;

  return (
    <>
      <UserTiles users={users} />
      <div className={RESULT_TABLE_CLASS}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{text.columnUser}</TableHead>
              <TableHead>{text.columnRoles}</TableHead>
              <TableHead>{text.columnStatus}</TableHead>
              <TableHead className="text-right">
                {text.columnSessions}
              </TableHead>
              <TableHead>{text.columnJoined}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <TextLink
                    render={
                      <Link to="/users/$userId" params={{ userId: user.id }} />
                    }
                    className={RESULT_NAME_LINK_CLASS}
                  >
                    <UserAvatar name={user.name} image={user.image} />
                    <span className="grid min-w-0">
                      <span className="truncate">{user.name}</span>
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {user.discordId}
                      </span>
                    </span>
                  </TextLink>
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
                <TableCell className="text-muted-foreground">
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
