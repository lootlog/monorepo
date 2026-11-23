import type { AdminOrganizationsOverview } from "@lootlog/schema/admin-organizations";
import { Button } from "@lootlog/ui/components/button";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import { PageHeader } from "@lootlog/ui/components/page-header";
import { SectionCard } from "@lootlog/ui/components/section-card";
import { StatsTile } from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
import { StatsTileNumber } from "@lootlog/ui/components/stats-tile-number";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, SearchX } from "lucide-react";
import { OrganizationsFilter } from "@/components/organizations-filter";
import { OrganizationsTable } from "@/components/organizations-table";
import { Pagination } from "@/components/pagination";
import { text } from "@/lib/messages";
import {
  hasOrganizationsFilters,
  validateOrganizationsSearch,
} from "@/lib/organizations-search";
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

const overviewTiles = (overview: AdminOrganizationsOverview) => [
  { label: text.organizationsOverviewTotal, value: overview.total },
  { label: text.organizationsOverviewActive, value: overview.active },
  { label: text.organizationsOverviewSuspended, value: overview.suspended },
  { label: text.organizationsOverviewSyncFailing, value: overview.syncFailing },
];

function OrganizationsPage() {
  const { overview, page } = Route.useLoaderData();
  const search = Route.useSearch();
  const filtered = hasOrganizationsFilters(search);

  return (
    <>
      <PageHeader
        icon={Building2}
        title={text.navOrganizations}
        description={text.organizationsCount(
          page.organizations.length,
          page.total,
        )}
      />
      <StatsTileGrid framed className="sm:grid-cols-2 xl:grid-cols-4">
        {overviewTiles(overview).map((tile) => (
          <StatsTile
            key={tile.label}
            label={tile.label}
            value={<StatsTileNumber value={tile.value} />}
          />
        ))}
      </StatsTileGrid>
      <SectionCard>
        <OrganizationsFilter search={search} />
        <OrganizationsTable
          organizations={page.organizations}
          empty={
            <EmptyState
              icon={filtered ? SearchX : Building2}
              title={text.organizationsEmpty}
              action={
                filtered ? (
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link to="/organizations" />}
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
      </SectionCard>
    </>
  );
}
