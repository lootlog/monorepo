import {
  InvalidRequestError,
  type PermissionDeniedError,
  RateLimitedError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  max,
  or,
  sql,
} from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import {
  type CatalogCaller,
  isCatalogModerator,
  requireCatalogModerator,
} from "#src/shared/catalog-caller";
import { returnedRow } from "@lootlog/database/returned-row";
import { Context, Effect, Layer } from "effect";
import { groupBy } from "es-toolkit";
import {
  CatalogDatabase,
  type CatalogDatabaseValue,
} from "#src/database/database";
import {
  catalogItemTable,
  catalogNpcTable,
  catalogReportTable,
} from "#src/database/schema";
import type {
  CatalogOwnReportQuery,
  CatalogReportDto_Output,
  CatalogReportSubjectType,
  CatalogReportsQuery,
  CatalogReportsResponseDto_Output,
  CreateCatalogReportRequest,
  ReviewCatalogReportsRequest,
} from "#src/http-api/contracts/reports/schemas";

export const DAILY_REPORT_LIMIT = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

type ReportRow = typeof catalogReportTable.$inferSelect;

type Subject = {
  readonly subjectType: CatalogReportSubjectType;
  readonly gameVersion: CatalogReportDto_Output["gameVersion"];
  readonly subjectId: number;
};

type SubjectName = { readonly name: string; readonly icon: string | null };

const subjectKey = ({ subjectType, gameVersion, subjectId }: Subject) =>
  `${subjectType}:${gameVersion}:${subjectId}`;

const matchesSubject = (subject: Subject) =>
  and(
    eq(catalogReportTable.subjectType, subject.subjectType),
    eq(catalogReportTable.gameVersion, subject.gameVersion),
    eq(catalogReportTable.subjectId, subject.subjectId),
  );

const isOpen = sql`${catalogReportTable.status} = 'OPEN'`;

const toReport = (row: ReportRow): CatalogReportDto_Output => ({
  id: row.id,
  subjectType: row.subjectType,
  gameVersion: row.gameVersion,
  subjectId: row.subjectId,
  reason: row.reason,
  comment: row.comment,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  reviewedAt: row.reviewedAt?.toISOString() ?? null,
});

const npcId = sql<number>`(${catalogNpcTable.document}->>'id')::integer`;

const npcGameVersion = sql`${catalogNpcTable.document}->>'gameVersion'`;

const isCurrentNpc = sql`${catalogNpcTable.document}->'current' is distinct from 'false'::jsonb`;

export const makeReportsModule = (database: CatalogDatabaseValue) => {
  const itemNames = (
    gameVersion: Subject["gameVersion"],
    ids: ReadonlyArray<number>,
  ) =>
    database
      .selectDistinctOn([catalogItemTable.itemId], {
        id: catalogItemTable.itemId,
        name: sql<string>`${catalogItemTable.document}->>'name'`,
        icon: sql<string | null>`${catalogItemTable.document}->>'icon'`,
      })
      .from(catalogItemTable)
      .where(
        and(
          eq(catalogItemTable.gameVersion, gameVersion),
          inArray(catalogItemTable.itemId, [...ids]),
        ),
      )
      .orderBy(
        asc(catalogItemTable.itemId),
        sql`(${catalogItemTable.document}->>'firstSeenAt')::bigint desc nulls last`,
        asc(catalogItemTable.uid),
      );

  const npcNames = (
    gameVersion: Subject["gameVersion"],
    ids: ReadonlyArray<number>,
  ) =>
    database
      .selectDistinctOn([npcId], {
        id: npcId,
        name: sql<string>`${catalogNpcTable.document}->>'name'`,
        icon: sql<string | null>`${catalogNpcTable.document}->>'icon'`,
      })
      .from(catalogNpcTable)
      .where(
        and(
          eq(npcGameVersion, gameVersion),
          inArray(npcId, [...ids]),
          isCurrentNpc,
        ),
      )
      .orderBy(npcId, asc(catalogNpcTable.uid));

  const subjectNames = (subjects: ReadonlyArray<Subject>) =>
    Effect.gen(function* () {
      const names = new Map<string, SubjectName>();

      const groups = groupBy(
        subjects,
        ({ subjectType, gameVersion }) => `${subjectType}:${gameVersion}`,
      );

      for (const group of Object.values(groups)) {
        const first = group[0];

        if (!first) continue;
        const { subjectType, gameVersion } = first;
        const ids = group.map(({ subjectId }) => subjectId);

        const rows =
          subjectType === "ITEM"
            ? yield* itemNames(gameVersion, ids)
            : yield* npcNames(gameVersion, ids);

        for (const { id, name, icon } of rows) {
          names.set(subjectKey({ subjectType, gameVersion, subjectId: id }), {
            name,
            icon,
          });
        }
      }

      return names;
    });

  const create = (
    caller: CatalogCaller,
    request: CreateCatalogReportRequest,
  ): Effect.Effect<
    CatalogReportDto_Output,
    | EffectDrizzleQueryError
    | InvalidRequestError
    | RateLimitedError
    | ResourceNotFoundError
  > =>
    Effect.gen(function* () {
      const comment = request.comment?.trim() || null;

      if (request.reason === "OTHER" && comment === null) {
        return yield* new InvalidRequestError({
          code: "COMMENT_REQUIRED",
          message: "A report of another problem needs a comment",
        });
      }

      const names = yield* subjectNames([request]);

      if (!names.has(subjectKey(request))) {
        return yield* new ResourceNotFoundError("Catalog page not found");
      }

      const [recent] = yield* database
        .select({ reports: count() })
        .from(catalogReportTable)
        .where(
          and(
            eq(catalogReportTable.reporterUserId, caller.userId),
            gt(catalogReportTable.createdAt, new Date(Date.now() - DAY_MS)),
          ),
        );

      if ((recent?.reports ?? 0) >= DAILY_REPORT_LIMIT) {
        return yield* new RateLimitedError({
          code: "REPORT_LIMIT_REACHED",
          message: "Too many reports today",
        });
      }

      const row = yield* database
        .insert(catalogReportTable)
        .values({
          subjectType: request.subjectType,
          gameVersion: request.gameVersion,
          subjectId: request.subjectId,
          reason: request.reason,
          comment,
          reporterUserId: caller.userId,
        })
        .onConflictDoUpdate({
          target: [
            catalogReportTable.reporterUserId,
            catalogReportTable.subjectType,
            catalogReportTable.gameVersion,
            catalogReportTable.subjectId,
          ],
          targetWhere: isOpen,
          set: { reason: request.reason, comment },
        })
        .returning()
        .pipe(Effect.flatMap(returnedRow("Report upsert")));

      return toReport(row);
    });

  const getOwn = (caller: CatalogCaller, subject: CatalogOwnReportQuery) =>
    database
      .select()
      .from(catalogReportTable)
      .where(
        and(
          eq(catalogReportTable.reporterUserId, caller.userId),
          matchesSubject(subject),
          isOpen,
        ),
      )
      .limit(1)
      .pipe(Effect.map(([row]) => ({ report: row ? toReport(row) : null })));

  const withdraw = (caller: CatalogCaller, reportId: string) =>
    database
      .delete(catalogReportTable)
      .where(
        and(
          eq(catalogReportTable.id, reportId),
          eq(catalogReportTable.reporterUserId, caller.userId),
          isOpen,
        ),
      )
      .returning({ id: catalogReportTable.id })
      .pipe(
        Effect.flatMap((rows) =>
          rows.length === 0
            ? Effect.fail(new ResourceNotFoundError("Open report not found"))
            : Effect.void,
        ),
      );

  const list = (
    caller: CatalogCaller,
    query: CatalogReportsQuery,
  ): Effect.Effect<
    CatalogReportsResponseDto_Output,
    EffectDrizzleQueryError | PermissionDeniedError
  > =>
    Effect.gen(function* () {
      yield* requireCatalogModerator(caller);

      const status = query.status ?? "OPEN";
      const ofStatus = eq(catalogReportTable.status, status);
      const reportCount = count();
      const latestAt = max(catalogReportTable.createdAt);

      const [{ total } = { total: 0 }] = yield* database
        .select({
          total: sql<number>`count(distinct (${catalogReportTable.subjectType}, ${catalogReportTable.gameVersion}, ${catalogReportTable.subjectId}))::integer`,
        })
        .from(catalogReportTable)
        .where(ofStatus);

      const subjects = yield* database
        .select({
          subjectType: catalogReportTable.subjectType,
          gameVersion: catalogReportTable.gameVersion,
          subjectId: catalogReportTable.subjectId,
        })
        .from(catalogReportTable)
        .where(ofStatus)
        .groupBy(
          catalogReportTable.subjectType,
          catalogReportTable.gameVersion,
          catalogReportTable.subjectId,
        )
        .orderBy(
          desc(reportCount),
          desc(latestAt),
          asc(catalogReportTable.subjectType),
          asc(catalogReportTable.subjectId),
        )
        .limit(query.limit ?? 20)
        .offset(query.offset ?? 0);

      if (subjects.length === 0) return { subjects: [], total };

      const rows = yield* database
        .select()
        .from(catalogReportTable)
        .where(and(ofStatus, or(...subjects.map(matchesSubject))))
        .orderBy(
          desc(catalogReportTable.createdAt),
          asc(catalogReportTable.id),
        );

      const reports = groupBy(rows.map(toReport), subjectKey);
      const names = yield* subjectNames(subjects);

      return {
        subjects: subjects.map((subject) => ({
          ...subject,
          name: names.get(subjectKey(subject))?.name ?? null,
          icon: names.get(subjectKey(subject))?.icon ?? null,
          reports: reports[subjectKey(subject)] ?? [],
        })),
        total,
      };
    });

  const review = (
    caller: CatalogCaller,
    { reportIds, status }: ReviewCatalogReportsRequest,
  ) =>
    Effect.gen(function* () {
      yield* requireCatalogModerator(caller);

      const ids = [...new Set(reportIds)];

      yield* database.transaction((transaction) =>
        Effect.gen(function* () {
          const rows = yield* transaction
            .select()
            .from(catalogReportTable)
            .where(inArray(catalogReportTable.id, ids))
            .for("update");

          if (rows.length !== ids.length) {
            return yield* new ResourceNotFoundError("Report not found");
          }

          if (status === "OPEN") {
            yield* ensureReopenable(transaction, rows);
          }

          yield* transaction
            .update(catalogReportTable)
            .set(
              status === "OPEN"
                ? { status, reviewedByUserId: null, reviewedAt: null }
                : {
                    status,
                    reviewedByUserId: caller.userId,
                    reviewedAt: new Date(),
                  },
            )
            .where(inArray(catalogReportTable.id, ids));
        }),
      );
    });

  const ensureReopenable = (
    transaction: Parameters<
      Parameters<CatalogDatabaseValue["transaction"]>[0]
    >[0],
    rows: ReadonlyArray<ReportRow>,
  ) =>
    Effect.gen(function* () {
      const reopening = rows.filter(({ status }) => status !== "OPEN");

      const reporterSubject = (row: ReportRow) =>
        `${row.reporterUserId}:${subjectKey(toReport(row))}`;

      const keys = reopening.map(reporterSubject);

      if (new Set(keys).size !== keys.length) {
        return yield* new ResourceConflictError({
          code: "REPORT_ALREADY_OPEN",
          message: "The reporter has another open report about the page",
        });
      }

      if (reopening.length === 0) return;

      const open = yield* transaction
        .select({ id: catalogReportTable.id })
        .from(catalogReportTable)
        .where(
          and(
            isOpen,
            or(
              ...reopening.map((row) =>
                and(
                  eq(catalogReportTable.reporterUserId, row.reporterUserId),
                  matchesSubject(toReport(row)),
                ),
              ),
            ),
          ),
        )
        .limit(1);

      if (open.length > 0) {
        return yield* new ResourceConflictError({
          code: "REPORT_ALREADY_OPEN",
          message: "The reporter has another open report about the page",
        });
      }
    });

  return {
    create,
    getOwn,
    withdraw,
    viewer: (caller: CatalogCaller) => ({
      canModerate: isCatalogModerator(caller),
    }),
    list,
    review,
  };
};

export type ReportsModule = ReturnType<typeof makeReportsModule>;

export class CatalogReports extends Context.Service<
  CatalogReports,
  ReportsModule
>()("@lootlog/catalog/CatalogReports") {
  static readonly layer = Layer.effect(
    CatalogReports,
    Effect.gen(function* () {
      const database = yield* CatalogDatabase;

      return CatalogReports.of(makeReportsModule(database));
    }),
  );
}
