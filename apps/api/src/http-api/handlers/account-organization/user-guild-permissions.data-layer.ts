import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  makeUserGuildPermissionsPersistence,
  makeUserGuildPermissionsProjection,
  type UserGuildPermissionsCache,
} from "#src/members/user-guild-permissions";
import {
  type AuthenticatedIdentity,
  AccountOrganizationOperationError,
} from "./account-organization.operations.js";

export const makeUserGuildPermissions = (
  database: typeof ApiDatabase.Service,
  cache: UserGuildPermissionsCache,
) => {
  const read = makeUserGuildPermissionsProjection(
    makeUserGuildPermissionsPersistence(database),
    cache,
  );

  return (identity: AuthenticatedIdentity) =>
    read(identity.discordId, identity.userId).pipe(
      Effect.mapError(
        (cause) => new AccountOrganizationOperationError({ cause }),
      ),
    );
};
