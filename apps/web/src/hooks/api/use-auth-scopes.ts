import {
  getAuthControllerGetScopesQueryKey,
  getAuthControllerGetScopesQueryOptions,
  useAuthControllerGetScopes,
} from "@lootlog/client/auth";

import { Schema, SchemaTransformation } from "effect";
import { readableEntries } from "@/lib/lenient-schema";

const normalizeAuthScopes = Schema.decodeUnknownSync(
  Schema.Union([
    Schema.String.pipe(
      Schema.decodeTo(
        Schema.Array(Schema.String),
        SchemaTransformation.transform<ReadonlyArray<string>, string>({
          decode: (scopes) => scopes.split(/\s+/).filter(Boolean),
          encode: (scopes) => scopes.join(" "),
        }),
      ),
    ),
    readableEntries(Schema.String),
  ]),
);

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
      select: normalizeAuthScopes,
    },
  });

  return query;
};
