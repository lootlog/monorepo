import { RpcBadRequestError, RpcNotFoundError } from "@lootlog/rpc/errors";
import {
  type AdminOrganizationMembersSearch,
  AdminOrganizationSort,
  type AdminOrganizationsSearch,
  AdminOrganizationStatus,
} from "@lootlog/schema/admin-organizations";
import { DiscordGuildSyncStatus } from "@lootlog/schema/discord";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema, type Types } from "effect";
import {
  type OrganizationAction,
  OrganizationActionRequest,
} from "@/lib/organization-action";
import { asOperator } from "./rpc.js";

export const ORGANIZATIONS_PAGE_SIZE = 25;

export const ORGANIZATION_MEMBERS_PAGE_SIZE = 50;

export const ORGANIZATION_AUDIT_PAGE_SIZE = 50;

const Page = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1));

const SearchText = Schema.String.check(Schema.isMaxLength(100));

const OrganizationsInput = Schema.Struct({
  search: Schema.optional(SearchText),
  status: Schema.optional(AdminOrganizationStatus),
  syncStatus: Schema.optional(DiscordGuildSyncStatus),
  missingPermissions: Schema.optional(Schema.Boolean),
  sort: Schema.optional(AdminOrganizationSort),
  page: Page,
});

const OrganizationInput = Schema.Struct({
  guildId: Schema.NonEmptyString,
  memberSearch: Schema.optional(SearchText),
  memberPage: Page,
});

const pageOffset = (page: number, size: number) => (page - 1) * size;

const searchQuery = (
  filters: Omit<typeof OrganizationsInput.Type, "page">,
  page: number,
) => {
  const query: Types.Mutable<AdminOrganizationsSearch> = {
    limit: ORGANIZATIONS_PAGE_SIZE,
    offset: pageOffset(page, ORGANIZATIONS_PAGE_SIZE),
  };

  if (filters.search) query.search = filters.search.slice(0, 100);

  if (filters.status) query.status = filters.status;

  if (filters.syncStatus) query.syncStatus = filters.syncStatus;

  if (filters.missingPermissions !== undefined)
    query.missingPermissions = filters.missingPermissions;

  if (filters.sort) query.sort = filters.sort;

  return query;
};

const membersQuery = (
  guildId: string,
  search: string | undefined,
  page: number,
) => {
  const query: Types.Mutable<AdminOrganizationMembersSearch> = {
    guildId,
    limit: ORGANIZATION_MEMBERS_PAGE_SIZE,
    offset: pageOffset(page, ORGANIZATION_MEMBERS_PAGE_SIZE),
  };

  if (search) query.search = search;

  return query;
};

export const getOrganizationsOverview = createServerFn({
  method: "GET",
}).handler(() =>
  asOperator(({ auth, api }, session) =>
    Effect.andThen(auth.getOperator(session), api.getOrganizationsOverview()),
  ),
);

export const listOrganizations = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(OrganizationsInput))
  .handler(({ data: { page, ...filters } }) =>
    asOperator(({ auth, api }, session) =>
      Effect.andThen(
        auth.getOperator(session),
        api.searchOrganizations(searchQuery(filters, page)),
      ),
    ),
  );

export const getOrganization = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(OrganizationInput))
  .handler(async ({ data: { guildId, memberSearch, memberPage } }) => {
    try {
      return await asOperator(({ auth, api }, session) =>
        Effect.andThen(
          auth.getOperator(session),
          Effect.all(
            {
              details: api.getOrganization({ guildId }),
              members: api.listOrganizationMembers(
                membersQuery(guildId, memberSearch, memberPage),
              ),
            },
            { concurrency: 2 },
          ),
        ),
      );
    } catch (error) {
      if (error instanceof RpcNotFoundError) throw notFound();

      throw error;
    }
  });

export const listOrganizationAudit = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(Page))
  .handler(({ data: page }) =>
    asOperator(({ auth, api }, session) =>
      Effect.andThen(
        auth.getOperator(session),
        api.listOrganizationAudit({
          limit: ORGANIZATION_AUDIT_PAGE_SIZE,
          offset: pageOffset(page, ORGANIZATION_AUDIT_PAGE_SIZE),
        }),
      ),
    ),
  );

const runOrganizationAction = (guildId: string, action: OrganizationAction) =>
  asOperator(({ auth, api }, session) =>
    Effect.flatMap(auth.getOperator(session), (operator) => {
      const target = {
        guildId,
        operatorUserId: operator.userId,
        operatorName: operator.name,
      };

      switch (action.action) {
        case "limits":
          return api.setOrganizationLimits({
            ...target,
            limits: action.limits,
          });
        case "clear-vanity-url":
          return api.clearOrganizationVanityUrl(target);
        case "refresh-discord-sync":
          return api.refreshOrganizationDiscordSync(target);
        case "suspend":
          return api.suspendOrganization({ ...target, reason: action.reason });
        case "resume":
          return api.resumeOrganization(target);
      }
    }),
  );

export const performOrganizationAction = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(OrganizationActionRequest))
  .handler(async ({ data }) => {
    try {
      await runOrganizationAction(data.guildId, data.action);

      return null;
    } catch (error) {
      if (error instanceof RpcBadRequestError) return "cooldown" as const;

      throw error;
    }
  });
