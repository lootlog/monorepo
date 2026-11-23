import type { AdminOrganizationsSearch } from "@lootlog/schema/admin-organizations";
import { Context, Effect } from "effect";
import {
  organizationChangeCommands,
  type OrganizationOperatorPorts,
} from "./organization-operator.changes.js";
import { organizationDetailQueries } from "./organization-operator.details.js";
import { organizationListQueries } from "./organization-operator.list.js";
import {
  type Database,
  OrganizationNotFound,
  OrganizationOperatorError,
  OrganizationSyncCooldown,
} from "./organization-operator.shared.js";

export type OrganizationOperatorFailure =
  | OrganizationNotFound
  | OrganizationSyncCooldown
  | OrganizationOperatorError;

const operation = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.mapError(effect, (cause): OrganizationOperatorFailure =>
    cause instanceof OrganizationNotFound ||
    cause instanceof OrganizationSyncCooldown ||
    cause instanceof OrganizationOperatorError
      ? cause
      : new OrganizationOperatorError({ cause }),
  );

export const makeOrganizationOperatorData = (
  database: Database,
  ports: OrganizationOperatorPorts,
) => {
  const list = organizationListQueries(database);
  const details = organizationDetailQueries(database, list);
  const changes = organizationChangeCommands(database, ports);

  return {
    getOverview: operation(list.getOverview()),
    searchOrganizations: (search: AdminOrganizationsSearch) =>
      operation(list.searchOrganizations(search)),
    getOrganization: (guildId: string) =>
      operation(details.getOrganization(guildId)),
    listMembers: (query: Parameters<typeof details.listMembers>[0]) =>
      operation(details.listMembers(query)),
    listUserOrganizations: (discordId: string) =>
      operation(details.listUserOrganizations(discordId)),
    listAudit: (limit: number, offset: number) =>
      operation(details.listAudit(limit, offset)),
    setEntitlement: (...args: Parameters<typeof changes.setEntitlement>) =>
      operation(changes.setEntitlement(...args)),
    clearVanityUrl: (...args: Parameters<typeof changes.clearVanityUrl>) =>
      operation(changes.clearVanityUrl(...args)),
    refreshDiscordSync: (
      ...args: Parameters<typeof changes.refreshDiscordSync>
    ) => operation(changes.refreshDiscordSync(...args)),
    suspend: (...args: Parameters<typeof changes.suspend>) =>
      operation(changes.suspend(...args)),
    resume: (...args: Parameters<typeof changes.resume>) =>
      operation(changes.resume(...args)),
  };
};

export class OrganizationOperatorData extends Context.Service<
  OrganizationOperatorData,
  ReturnType<typeof makeOrganizationOperatorData>
>()("@lootlog/api/guilds/OrganizationOperatorData") {}
