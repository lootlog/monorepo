import {
  type AdminAuditEntry,
  type AdminControllerListUsersParams,
  adminControllerGetUser,
  adminControllerListAudit,
  adminControllerListUsers,
  adminControllerOverview,
  adminControllerSession,
} from "@lootlog/client/auth";
import { ApiError } from "@lootlog/client/transport";
import { PlatformRole } from "@lootlog/schema/platform-roles";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Predicate, Schema } from "effect";
import { UserActionRequest } from "@/lib/user-action";
import { asPanel } from "./auth-api.js";
import { adminConfig } from "./config.js";
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
  page: Page,
});

export type OperatorAccess =
  | { readonly status: "admin"; readonly userId: string; readonly name: string }
  | { readonly status: "signed-out" | "not-admin" };

export const getOperatorAccess = createServerFn({ method: "GET" }).handler(
  async (): Promise<OperatorAccess> => {
    try {
      const operator = await adminControllerSession(asPanel());

      return { status: "admin", userId: operator.userId, name: operator.name };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401)
        return { status: "signed-out" };

      if (error instanceof ApiError && error.status === 403)
        return { status: "not-admin" };

      throw error;
    }
  },
);

export const getWebUrl = createServerFn({ method: "GET" }).handler(
  () => adminConfig().webUrl,
);

export const getOverview = createServerFn({ method: "GET" }).handler(() =>
  adminControllerOverview(asPanel()),
);

export const listUsers = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(UsersInput))
  .handler(({ data }) => {
    const params: AdminControllerListUsersParams = {
      limit: `${USERS_PAGE_SIZE}`,
      offset: `${(data.page - 1) * USERS_PAGE_SIZE}`,
    };

    if (data.search) params.search = data.search.slice(0, 100);

    if (data.role) params.role = data.role;

    if (data.banned !== undefined) params.banned = `${data.banned}`;

    return adminControllerListUsers(params, asPanel());
  });

export const getUser = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(Schema.NonEmptyString))
  .handler(async ({ data: id }) => {
    try {
      const details = await adminControllerGetUser({ id }, asPanel());

      return { ...details, audit: details.audit.map(toAuditRow) };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();

      throw error;
    }
  });

export const listAudit = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(Page))
  .handler(async ({ data: page }) => {
    const audit = await adminControllerListAudit(
      {
        limit: `${AUDIT_PAGE_SIZE}`,
        offset: `${(page - 1) * AUDIT_PAGE_SIZE}`,
      },
      asPanel(),
    );

    return { total: audit.total, entries: audit.entries.map(toAuditRow) };
  });

export const performUserAction = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(UserActionRequest))
  .handler(({ data }) => runUserAction(data.userId, data.action));
