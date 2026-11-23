import { Link, createFileRoute } from "@tanstack/react-router";
import { OrganizationsFilter } from "@/components/organizations-filter";
import { OrganizationsTable } from "@/components/organizations-table";
import { Pagination } from "@/components/pagination";
import { StatTiles } from "@/components/stat-tiles";
import { text } from "@/lib/messages";
import { validateOrganizationsSearch } from "@/lib/organizations-search";
import {
  ORGANIZATIONS_PAGE_SIZE,
  getOrganizationsOverview,
  listOrganizations,
} from "@/server/organizations";

export const Route = createFileRoute("/organizations/")({
  validateSearch: validateOrganizationsSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [overview, page] = await Promise.all([
      getOrganizationsOverview(),
      listOrganizations({
        data: {
          page: deps.page ?? 1,
          search: deps.search,
          status: deps.status,
          syncStatus: deps.sync,
          missingPermissions:
            deps.missing === undefined ? undefined : deps.missing === "yes",
          sort: deps.sort,
        },
      }),
    ]);

    return { overview, page };
  },
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const { overview, page } = Route.useLoaderData();
  const search = Route.useSearch();

  return (
    <>
      <StatTiles
        tiles={[
          { label: text.organizationsOverviewTotal, value: overview.total },
          { label: text.organizationsOverviewActive, value: overview.active },
          {
            label: text.organizationsOverviewSuspended,
            value: overview.suspended,
          },
          {
            label: text.organizationsOverviewSyncFailing,
            value: overview.syncFailing,
          },
        ]}
      />
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold">{text.navOrganizations}</h1>
          <p className="text-sm text-muted-foreground">
            {text.organizationsCount(page.organizations.length, page.total)}
          </p>
        </div>
        <OrganizationsFilter search={search} />
        <OrganizationsTable organizations={page.organizations} />
        <Pagination
          page={search.page ?? 1}
          pageSize={ORGANIZATIONS_PAGE_SIZE}
          total={page.total}
          renderLink={(target, className, label) => (
            <Link
              to="/organizations"
              search={{ ...search, page: target }}
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
