import type { AdminOrganizationMembersPage } from "@lootlog/schema/admin-organizations";
import { Badge } from "@lootlog/ui/components/badge";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link, useNavigate } from "@tanstack/react-router";
import { SearchX, Users } from "lucide-react";
import { FilterBarRow } from "@/components/filter-bar-row";
import { Pagination } from "@/components/pagination";
import { SearchForm } from "@/components/search-form";
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
  const navigate = useNavigate();

  return (
    <>
      <FilterBarRow
        search={
          <SearchForm
            value={search}
            placeholder={text.membersSearchPlaceholder}
            onSearch={(members) =>
              void navigate({
                to: "/organizations/$guildId",
                params: { guildId },
                search: { members },
                hash: "members",
              })
            }
          />
        }
      />
      {members.members.length === 0 ? (
        <EmptyState
          compact
          icon={search === undefined ? Users : SearchX}
          title={text.membersEmpty}
        />
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
                      <TextLink
                        render={
                          <Link
                            to="/users/$userId"
                            params={{ userId: member.userId }}
                          />
                        }
                        className="w-fit text-sm"
                      >
                        {member.name}
                      </TextLink>
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
    </>
  );
}
