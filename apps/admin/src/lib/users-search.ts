import { PlatformRole } from "@lootlog/schema/platform-roles";
import {
  readPage,
  readSearchParam,
  readText,
  readYesNo,
} from "@/lib/search-params";

export type UsersSearch = {
  search?: string | undefined;
  role?: PlatformRole | undefined;
  banned?: "yes" | "no" | undefined;
  aura?: "yes" | "no" | undefined;
  page?: number | undefined;
};

const readRole = readSearchParam(PlatformRole);

export const validateUsersSearch = (search: {
  search?: unknown;
  role?: unknown;
  banned?: unknown;
  aura?: unknown;
  page?: unknown;
}): UsersSearch => ({
  search: readText(search.search),
  role: readRole(search.role),
  banned: readYesNo(search.banned),
  aura: readYesNo(search.aura),
  page: readPage(search.page),
});
