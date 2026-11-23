import {
  RpcForbiddenError,
  RpcNotFoundError,
  RpcUnauthorizedError,
} from "@lootlog/rpc/errors";
import type { AdminAuditEntry, AdminUsersSearch } from "@lootlog/schema/admin";
import { PlatformRole } from "@lootlog/schema/platform-roles";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Predicate, Schema, type Types } from "effect";
import { UserActionRequest } from "@/lib/user-action";
import { getAuraGrants, listAuraHolderIds } from "./character-auras.js";
import { adminConfig } from "./config.js";
import { asOperator } from "./rpc.js";
import { runUserAction } from "./user-actions.js";

export type AuditRow = Omit<AdminAuditEntry, "details"> & {
  readonly details: string;
  readonly incomplete: boolean;
};

const toAuditRow = ({ details, ...entry }: AdminAuditEntry): AuditRow => {
  const { completed, ...described } = details ?? {};

  return {
    ...entry,
    incomplete: completed === false,
    details: Object.entries(described)
      .map(
        ([key, value]) =>
          `${key}: ${Predicate.isString(value) ? value : JSON.stringify(value)}`,
      )
      .join(" · "),
  };
};

export const USERS_PAGE_SIZE = 25;

export const AUDIT_PAGE_SIZE = 50;

const Page = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1));

const UsersInput = Schema.Struct({
  search: Schema.optional(Schema.String),
  role: Schema.optional(PlatformRole),
  banned: Schema.optional(Schema.Boolean),
  aura: Schema.optional(Schema.Boolean),
  page: Page,
});

export type OperatorAccess =
  | { readonly status: "admin"; readonly userId: string; readonly name: string }
  | { readonly status: "signed-out" | "not-admin" };

export const getOperatorAccess = createServerFn({ method: "GET" }).handler(
  async (): Promise<OperatorAccess> => {
    try {
      const operator = await asOperator(({ auth }, session) =>
        auth.getOperator(session),
      );

      return { status: "admin", userId: operator.userId, name: operator.name };
    } catch (error) {
      if (error instanceof RpcUnauthorizedError)
        return { status: "signed-out" };

      if (error instanceof RpcForbiddenError) return { status: "not-admin" };

      throw error;
    }
  },
);

export const getWebUrl = createServerFn({ method: "GET" }).handler(
  () => adminConfig().webUrl,
);

export const getOverview = createServerFn({ method: "GET" }).handler(() =>
  asOperator(({ auth }, session) => auth.getUsersOverview(session)),
);

export const listUsers = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(UsersInput))
  .handler(async ({ data }) => {
    const query: Types.Mutable<AdminUsersSearch> = {
      limit: USERS_PAGE_SIZE,
      offset: (data.page - 1) * USERS_PAGE_SIZE,
    };

    if (data.search) query.search = data.search.slice(0, 100);

    if (data.role) query.role = data.role;

    if (data.banned !== undefined) query.banned = data.banned;

    if (data.aura !== undefined) {
      const holders = await listAuraHolderIds();

      if (data.aura) query.userIds = holders;
      else query.excludedUserIds = holders;
    }

    return asOperator(({ auth }, session) =>
      auth.searchUsers({ ...session, ...query }),
    );
  });

export const getUser = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(Schema.NonEmptyString))
  .handler(async ({ data: userId }) => {
    try {
      const [details, auras] = await Promise.all([
        asOperator(({ auth }, session) =>
          auth.getUserDetails({ ...session, userId }),
        ),
        getAuraGrants(userId).then(
          (value) => ({ status: "ok" as const, value }),
          () => ({ status: "unavailable" as const }),
        ),
      ]);

      return { ...details, audit: details.audit.map(toAuditRow), auras };
    } catch (error) {
      if (error instanceof RpcNotFoundError) throw notFound();

      throw error;
    }
  });

export const listAudit = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(Page))
  .handler(async ({ data: page }) => {
    const audit = await asOperator(({ auth }, session) =>
      auth.listAuditLog({
        ...session,
        limit: AUDIT_PAGE_SIZE,
        offset: (page - 1) * AUDIT_PAGE_SIZE,
      }),
    );

    return { total: audit.total, entries: audit.entries.map(toAuditRow) };
  });

export const performUserAction = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(UserActionRequest))
  .handler(({ data }) => runUserAction(data.userId, data.action));
