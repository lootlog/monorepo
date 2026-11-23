import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Link, createFileRoute } from "@tanstack/react-router";
import { OverviewTiles } from "@/components/overview-tiles";
import { Pagination } from "@/components/pagination";
import { UsersFilter } from "@/components/users-filter";
import { UsersTable } from "@/components/users-table";
import { text } from "@/lib/messages";
import { validateUsersSearch } from "@/lib/users-search";
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

  return (
    <>
      <OverviewTiles overview={overview} />
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold">{text.navUsers}</h1>
          <p className="text-sm text-muted-foreground">
            {text.usersCount(users.users.length, users.total)}
          </p>
        </div>
        <UsersFilter search={search} />
        {users.aurasForbidden ? (
          <Alert variant="destructive">
            <AlertDescription>{text.aurasForbidden}</AlertDescription>
          </Alert>
        ) : null}
        <UsersTable users={users.users} />
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
      </div>
    </>
  );
}
