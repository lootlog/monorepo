import { isNotNil } from "es-toolkit";
import {
  getAuthControllerGetScopesQueryKey,
  getAuthControllerGetScopesQueryOptions,
  useAuthControllerGetScopes,
} from "@lootlog/client/auth";

import { z } from "zod";

const normalizeAuthScopes = z
  .union([
    z
      .array(z.string().nullable().catch(null))
      .transform((scopes) => scopes.filter(isNotNil)),
    z.string().transform((scopes) => scopes.split(/\s+/).filter(Boolean)),
  ])
  .catch([]).parse;

export const authScopesQueryOptions = () =>
  getAuthControllerGetScopesQueryOptions({
    query: {
      queryKey: getAuthControllerGetScopesQueryKey(),
      select: normalizeAuthScopes,
    },
  });

export const useAuthScopes = () => {
  const query = useAuthControllerGetScopes({
    query: {
      queryKey: getAuthControllerGetScopesQueryKey(),
      select: normalizeAuthScopes,
    },
  });

  return query;
};
