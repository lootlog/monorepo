import {
  ADMIN_ORGANIZATION_SORTS,
  ADMIN_ORGANIZATION_STATUSES,
} from "@lootlog/schema/admin-organizations";
import { Button } from "@lootlog/ui/components/button";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { useNavigate } from "@tanstack/react-router";
import { FilterBarRow } from "@/components/filter-bar-row";
import { SearchForm } from "@/components/search-form";
import {
  organizationSortText,
  organizationStatusText,
  syncStatusText,
  text,
} from "@/lib/messages";
import {
  hasOrganizationsFilters,
  type OrganizationsSearch,
} from "@/lib/organizations-search";
import { toggleSearchValue } from "@/lib/search-params";

const SYNC_STATUSES = [
  "SYNCED",
  "STALE",
  "SYNCING",
  "FAILED",
  "NOT_FOUND",
] as const;

const DEFAULT_SORT = "created";

const statusOptions = ADMIN_ORGANIZATION_STATUSES.map((status) => ({
  value: status,
  label: organizationStatusText[status],
}));

const syncOptions = SYNC_STATUSES.map((status) => ({
  value: status,
  label: syncStatusText[status],
}));

const permissionOptions = [
  { value: "yes" as const, label: text.organizationsFilterMissingPermissions },
  { value: "no" as const, label: text.organizationsFilterAllPermissions },
];

const sortOptions = ADMIN_ORGANIZATION_SORTS.map((sort) => ({
  value: sort,
  label: organizationSortText[sort],
}));

export function OrganizationsFilter({
  search,
}: {
  search: OrganizationsSearch;
}) {
  const navigate = useNavigate();

  const update = (patch: Partial<OrganizationsSearch>) =>
    void navigate({
      to: "/organizations",
      search: { ...search, ...patch, page: undefined },
    });

  return (
    <FilterBarRow
      search={
        <SearchForm
          value={search.search}
          placeholder={text.organizationsFilterSearchPlaceholder}
          onSearch={(value) => update({ search: value })}
        />
      }
    >
      <FilterPopover
        options={statusOptions}
        value={search.status}
        onValueChange={(status) =>
          update({ status: toggleSearchValue(search.status, status) })
        }
        placeholder={text.organizationsFilterStatus}
        showSearch={false}
        active={search.status !== undefined}
      />
      <FilterPopover
        options={syncOptions}
        value={search.sync}
        onValueChange={(sync) =>
          update({ sync: toggleSearchValue(search.sync, sync) })
        }
        placeholder={text.organizationsFilterSync}
        showSearch={false}
        active={search.sync !== undefined}
      />
      <FilterPopover
        options={permissionOptions}
        value={search.missing}
        onValueChange={(missing) =>
          update({ missing: toggleSearchValue(search.missing, missing) })
        }
        placeholder={text.organizationsFilterPermissions}
        showSearch={false}
        active={search.missing !== undefined}
      />
      <FilterPopover
        options={sortOptions}
        value={search.sort ?? DEFAULT_SORT}
        onValueChange={(sort) =>
          update({ sort: sort === DEFAULT_SORT ? undefined : sort })
        }
        placeholder={text.organizationsFilterSort}
        showSearch={false}
        active={search.sort !== undefined}
      />
      {hasOrganizationsFilters(search) || search.sort !== undefined ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => void navigate({ to: "/organizations", search: {} })}
        >
          {text.filterClear}
        </Button>
      ) : null}
    </FilterBarRow>
  );
}
