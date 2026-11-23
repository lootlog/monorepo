import {
  ADMIN_ORGANIZATION_SORTS,
  ADMIN_ORGANIZATION_STATUSES,
} from "@lootlog/schema/admin-organizations";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { buttonVariants } from "@lootlog/ui/lib/button-variants";
import { Link } from "@tanstack/react-router";
import {
  organizationSortText,
  organizationStatusText,
  syncStatusText,
  text,
} from "@/lib/messages";
import type { OrganizationsSearch } from "@/lib/organizations-search";

const ANY = "any";

const SYNC_STATUSES = [
  "SYNCED",
  "STALE",
  "SYNCING",
  "FAILED",
  "NOT_FOUND",
] as const;

const filters = [
  {
    name: "status",
    label: text.organizationsFilterStatus,
    defaultValue: ANY,
    items: [
      { value: ANY, label: text.organizationsFilterAnyStatus },
      ...ADMIN_ORGANIZATION_STATUSES.map((status) => ({
        value: status,
        label: organizationStatusText[status],
      })),
    ],
  },
  {
    name: "sync",
    label: text.organizationsFilterSync,
    defaultValue: ANY,
    items: [
      { value: ANY, label: text.organizationsFilterAnySync },
      ...SYNC_STATUSES.map((status) => ({
        value: status,
        label: syncStatusText[status],
      })),
    ],
  },
  {
    name: "missing",
    label: text.organizationsFilterPermissions,
    defaultValue: ANY,
    items: [
      { value: ANY, label: text.organizationsFilterAnyPermissions },
      { value: "yes", label: text.organizationsFilterMissingPermissions },
      { value: "no", label: text.organizationsFilterAllPermissions },
    ],
  },
  {
    name: "sort",
    label: text.organizationsFilterSort,
    defaultValue: "created",
    items: ADMIN_ORGANIZATION_SORTS.map((sort) => ({
      value: sort,
      label: organizationSortText[sort],
    })),
  },
] as const;

export function OrganizationsFilter({
  search,
}: {
  search: OrganizationsSearch;
}) {
  const values: Record<(typeof filters)[number]["name"], string | undefined> = {
    status: search.status,
    sync: search.sync,
    missing: search.missing,
    sort: search.sort,
  };

  return (
    <form
      key={[
        search.search,
        search.status,
        search.sync,
        search.missing,
        search.sort,
      ].join("\n")}
      method="get"
      action="/organizations"
      role="search"
      className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-4 md:items-end xl:grid-cols-[minmax(0,1fr)_10rem_10rem_11rem_11rem_auto]"
    >
      <div className="grid gap-1.5 md:col-span-4 xl:col-span-1">
        <Label htmlFor="filter-search">{text.filterSearch}</Label>
        <Input
          id="filter-search"
          name="search"
          type="search"
          maxLength={100}
          defaultValue={search.search ?? ""}
          placeholder={text.organizationsFilterSearchPlaceholder}
        />
      </div>
      {filters.map((filter) => (
        <div key={filter.name} className="grid gap-1.5">
          <Label htmlFor={`filter-${filter.name}`}>{filter.label}</Label>
          <Select
            name={filter.name}
            items={filter.items}
            defaultValue={values[filter.name] ?? filter.defaultValue}
          >
            <SelectTrigger id={`filter-${filter.name}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filter.items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      <div className="flex gap-2 md:col-span-4 xl:col-span-1">
        <Button type="submit">{text.filterApply}</Button>
        <Link
          to="/organizations"
          className={buttonVariants({ variant: "outline" })}
        >
          {text.filterClear}
        </Link>
      </div>
    </form>
  );
}
