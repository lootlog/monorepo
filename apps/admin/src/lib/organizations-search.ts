import {
  AdminOrganizationSort,
  AdminOrganizationStatus,
} from "@lootlog/schema/admin-organizations";
import { DiscordGuildSyncStatus } from "@lootlog/schema/discord";
import {
  readPage,
  readSearchParam,
  readText,
  readYesNo,
} from "@/lib/search-params";

export type OrganizationsSearch = {
  search?: string | undefined;
  status?: AdminOrganizationStatus | undefined;
  sync?: DiscordGuildSyncStatus | undefined;
  missing?: "yes" | "no" | undefined;
  sort?: AdminOrganizationSort | undefined;
  page?: number | undefined;
};

const readStatus = readSearchParam(AdminOrganizationStatus);

const readSync = readSearchParam(DiscordGuildSyncStatus);

const readSort = readSearchParam(AdminOrganizationSort);

export const validateOrganizationsSearch = (search: {
  search?: unknown;
  status?: unknown;
  sync?: unknown;
  missing?: unknown;
  sort?: unknown;
  page?: unknown;
}): OrganizationsSearch => ({
  search: readText(search.search),
  status: readStatus(search.status),
  sync: readSync(search.sync),
  missing: readYesNo(search.missing),
  sort: readSort(search.sort),
  page: readPage(search.page),
});

export const hasOrganizationsFilters = (search: OrganizationsSearch) =>
  [search.search, search.status, search.sync, search.missing].some(
    (value) => value !== undefined,
  );
