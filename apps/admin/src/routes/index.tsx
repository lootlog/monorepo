import { EmptyState } from "@lootlog/ui/components/empty-state";
import { PageHeader } from "@lootlog/ui/components/page-header";
import { SectionCard } from "@lootlog/ui/components/section-card";
import { Button } from "@lootlog/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { SearchX, Users } from "lucide-react";
import { OverviewTiles } from "@/components/overview-tiles";
import { Pagination } from "@/components/pagination";
import { UsersFilter } from "@/components/users-filter";
import { UsersTable } from "@/components/users-table";
import { text } from "@/lib/messages";
import { hasUsersFilters, validateUsersSearch } from "@/lib/users-search";
import { USERS_PAGE_SIZE, getOverview, listUsers } from "@/server/queries";

export const Route = createFileRoute("/")({
  validateSearch: validateUsersSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [overview, users] = await Promise.all([
      getOverview(),
      listUsers({
        data: {
          page: deps.page ?? 1,
          search: deps.search,
          role: deps.role,
          banned: deps.banned === undefined ? undefined : deps.banned === "yes",
          aura: deps.aura === undefined ? undefined : deps.aura === "yes",
        },
      }),
    ]);

    return { overview, users };
  },
  component: UsersPage,
});

function UsersPage() {
  const { overview, users } = Route.useLoaderData();
  const search = Route.useSearch();
  const filtered = hasUsersFilters(search);

  return (
    <>
      <PageHeader
        icon={Users}
        title={text.navUsers}
        description={text.usersCount(users.users.length, users.total)}
      />
      <OverviewTiles overview={overview} />
      <SectionCard>
        <UsersFilter search={search} />
        <UsersTable
          users={users.users}
          empty={
            <EmptyState
              icon={filtered ? SearchX : Users}
              title={text.usersEmpty}
              action={
                filtered ? (
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link to="/" />}
                  >
                    {text.filterClear}
                  </Button>
                ) : null
              }
            />
          }
        />
        <Pagination
          page={search.page ?? 1}
          pageSize={USERS_PAGE_SIZE}
          total={users.total}
          renderLink={(page, className, label) => (
            <Link
              to="/"
              search={{ ...search, page }}
              className={className}
              key={label}
            >
              {label}
            </Link>
          )}
        />
      </SectionCard>
    </>
  );
}
