import type { AdminOrganizationMembersPage } from "@lootlog/schema/admin-organizations";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { Link } from "@tanstack/react-router";
import { Pagination } from "@/components/pagination";
import { formatDate } from "@/lib/format";
import { memberTypeText, text } from "@/lib/messages";
import { ORGANIZATION_MEMBERS_PAGE_SIZE } from "@/server/organizations";

export function OrganizationMembers({
  guildId,
  members,
  search,
  page,
}: {
  guildId: string;
  members: AdminOrganizationMembersPage;
  search: string | undefined;
  page: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <form
        key={search ?? ""}
        method="get"
        action={`/organizations/${encodeURIComponent(guildId)}#members`}
        role="search"
        className="flex flex-wrap items-end gap-2"
      >
        <div className="grid min-w-0 flex-1 gap-1.5">
          <Label htmlFor="members-search">{text.filterSearch}</Label>
          <Input
            id="members-search"
            name="members"
            type="search"
            maxLength={100}
            defaultValue={search ?? ""}
            placeholder={text.membersSearchPlaceholder}
          />
        </div>
        <Button type="submit">{text.filterApply}</Button>
      </form>
      {members.members.length === 0 ? (
        <p className="text-sm text-muted-foreground">{text.membersEmpty}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{text.memberName}</TableHead>
              <TableHead>{text.memberType}</TableHead>
              <TableHead>{text.memberStatus}</TableHead>
              <TableHead className="hidden md:table-cell">
                {text.memberJoined}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="whitespace-normal">
                  <span className="grid min-w-0">
                    {member.userId === null ? (
                      <span className="font-medium">{member.name}</span>
                    ) : (
                      <Link
                        to="/users/$userId"
                        params={{ userId: member.userId }}
                        className="rounded-control font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {member.name}
                      </Link>
                    )}
                    <span className="truncate text-xs text-muted-foreground">
                      {member.username !== null &&
                      member.username !== member.name
                        ? member.username
                        : member.discordId}
                    </span>
                  </span>
                </TableCell>
                <TableCell>{memberTypeText[member.type]}</TableCell>
                <TableCell>
                  {member.active ? (
                    <Badge variant="ready">{text.memberActive}</Badge>
                  ) : (
                    <Badge variant="secondary">{text.memberInactive}</Badge>
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {member.joinedAt === null ? "—" : formatDate(member.joinedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination
        page={page}
        pageSize={ORGANIZATION_MEMBERS_PAGE_SIZE}
        total={members.total}
        renderLink={(target, className, label) => (
          <Link
            to="/organizations/$guildId"
            params={{ guildId }}
            search={{ members: search, page: target }}
            hash="members"
            className={className}
            key={label}
          >
            {label}
          </Link>
        )}
      />
    </div>
  );
}
