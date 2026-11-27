import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { stableJsonStringify } from "@lootlog/schema/stable-json";
import {
  gameFactSubject,
  type GameFact,
  type GameFactKind,
} from "@lootlog/game-facts/facts";
import { Context, Effect, Layer } from "effect";
import { chunk, groupBy } from "es-toolkit";
import {
  CatalogDatabase,
  type CatalogDatabaseValue,
} from "#src/database/database";
import {
  catalogFactObservationTable,
  catalogFactSubmissionTable,
  catalogFactTable,
} from "#src/database/schema";
import type {
  CatalogFactPreviewResponse,
  CatalogFactSubmissionRequest,
  CatalogFactSubmissionResponse,
} from "#src/http-api/contracts/facts/schemas";
import {
  type CatalogCaller,
  requireCatalogModerator,
} from "#src/shared/catalog-caller";

const WRITE_CHUNK = 1000;

type Variant = {
  readonly factIndex: number;
  readonly kind: GameFactKind;
  readonly subject: string;
  readonly contentHash: string;
  readonly document: GameFact;
  readonly firstObservedAt: Date;
  readonly lastObservedAt: Date;
};

const contentHash = (fact: GameFact) =>
  new Bun.CryptoHasher("sha256")
    .update(stableJsonStringify(fact))
    .digest("hex");

const subjectKey = ({ kind, subject }: { kind: string; subject: string }) =>
  `${kind}:${subject}`;

const toVariants = (facts: CatalogFactSubmissionRequest["facts"]) => {
  const variants = new Map<string, Variant>();

  for (const [factIndex, { fact, observedAt }] of facts.entries()) {
    const at = new Date(observedAt);

    const variant: Variant = {
      factIndex,
      kind: fact.kind,
      subject: gameFactSubject(fact),
      contentHash: contentHash(fact),
      document: fact,
      firstObservedAt: at,
      lastObservedAt: at,
    };

    const key = `${subjectKey(variant)}:${variant.contentHash}`;
    const known = variants.get(key);

    variants.set(
      key,
      known
        ? {
            ...known,
            firstObservedAt:
              at < known.firstObservedAt ? at : known.firstObservedAt,
            lastObservedAt:
              at > known.lastObservedAt ? at : known.lastObservedAt,
          }
        : variant,
    );
  }

  return [...variants.values()];
};

export const makeFactsModule = (database: CatalogDatabaseValue) => {
  const currentVariants = (
    gameVersion: CatalogFactSubmissionRequest["gameVersion"],
    variants: ReadonlyArray<Variant>,
  ) => {
    const subjectsByKind = Object.entries(
      groupBy(variants, ({ kind }) => kind),
    ).flatMap(([, group]) => {
      const kind = group[0]?.kind;

      return kind === undefined
        ? []
        : [
            and(
              eq(catalogFactTable.kind, kind),
              inArray(catalogFactTable.subject, [
                ...new Set(group.map(({ subject }) => subject)),
              ]),
            ),
          ];
    });

    return database
      .selectDistinctOn([catalogFactTable.kind, catalogFactTable.subject], {
        kind: catalogFactTable.kind,
        subject: catalogFactTable.subject,
        contentHash: catalogFactTable.contentHash,
        document: catalogFactTable.document,
        lastObservedAt: catalogFactTable.lastObservedAt,
      })
      .from(catalogFactTable)
      .where(
        and(
          eq(catalogFactTable.gameVersion, gameVersion),
          or(...subjectsByKind),
        ),
      )
      .orderBy(
        catalogFactTable.kind,
        catalogFactTable.subject,
        desc(catalogFactTable.lastObservedAt),
      );
  };

  const findSubmission = (submissionKey: string) =>
    database
      .select({ id: catalogFactSubmissionTable.id })
      .from(catalogFactSubmissionTable)
      .where(eq(catalogFactSubmissionTable.submissionKey, submissionKey))
      .limit(1);

  const preview = Effect.fn("CatalogFacts.preview")(function* (
    caller: CatalogCaller,
    request: CatalogFactSubmissionRequest,
  ) {
    yield* requireCatalogModerator(caller);

    const variants = toVariants(request.facts);

    const [current, submission] = yield* Effect.all([
      currentVariants(request.gameVersion, variants),
      findSubmission(request.submissionKey),
    ]);

    const currentBySubject = new Map(
      current.map((row) => [subjectKey(row), row]),
    );

    const facts = variants.map((variant) => {
      const shown = currentBySubject.get(subjectKey(variant));

      const base = {
        factIndex: variant.factIndex,
        kind: variant.kind,
        subject: variant.subject,
      };

      if (!shown) return { ...base, status: "NEW" as const, current: null };

      if (shown.contentHash === variant.contentHash) {
        return { ...base, status: "SAME" as const, current: null };
      }

      return {
        ...base,
        status:
          shown.lastObservedAt > variant.lastObservedAt
            ? ("OLDER" as const)
            : ("CHANGED" as const),
        current: shown.document,
      };
    });

    return {
      alreadyImported: submission.length > 0,
      facts,
    } satisfies CatalogFactPreviewResponse;
  });

  const submit = Effect.fn("CatalogFacts.submit")(function* (
    caller: CatalogCaller,
    request: CatalogFactSubmissionRequest,
  ) {
    yield* requireCatalogModerator(caller);

    const variants = toVariants(request.facts);

    return yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const [created] = yield* transaction
          .insert(catalogFactSubmissionTable)
          .values({
            submissionKey: request.submissionKey,
            source: request.source,
            contributorUserId: caller.userId,
            gameVersion: request.gameVersion,
            world: request.world,
            extractorVersion: request.extractorVersion,
            factCount: variants.length,
          })
          .onConflictDoNothing({
            target: catalogFactSubmissionTable.submissionKey,
          })
          .returning({ id: catalogFactSubmissionTable.id });

        if (!created) {
          const [existing] = yield* findSubmission(request.submissionKey);

          return {
            submissionId: existing?.id ?? "",
            alreadyImported: true,
            newVariants: 0,
            confirmedVariants: 0,
          } satisfies CatalogFactSubmissionResponse;
        }

        let newVariants = 0;

        for (const batch of chunk(variants, WRITE_CHUNK)) {
          const written = yield* transaction
            .insert(catalogFactTable)
            .values(
              batch.map((variant) => ({
                gameVersion: request.gameVersion,
                kind: variant.kind,
                subject: variant.subject,
                contentHash: variant.contentHash,
                document: variant.document,
                firstObservedAt: variant.firstObservedAt,
                lastObservedAt: variant.lastObservedAt,
              })),
            )
            .onConflictDoUpdate({
              target: [
                catalogFactTable.gameVersion,
                catalogFactTable.kind,
                catalogFactTable.subject,
                catalogFactTable.contentHash,
              ],
              set: {
                firstObservedAt: sql`least(${catalogFactTable.firstObservedAt}, excluded.${sql.identifier(catalogFactTable.firstObservedAt.name)})`,
                lastObservedAt: sql`greatest(${catalogFactTable.lastObservedAt}, excluded.${sql.identifier(catalogFactTable.lastObservedAt.name)})`,
              },
            })
            .returning({
              id: catalogFactTable.id,
              inserted: sql<boolean>`xmax = 0`,
            });

          newVariants += written.filter(({ inserted }) => inserted).length;

          yield* transaction
            .insert(catalogFactObservationTable)
            .values(
              written.map(({ id }) => ({
                factId: id,
                submissionId: created.id,
              })),
            )
            .onConflictDoNothing();
        }

        return {
          submissionId: created.id,
          alreadyImported: false,
          newVariants,
          confirmedVariants: variants.length - newVariants,
        } satisfies CatalogFactSubmissionResponse;
      }),
    );
  });

  return { preview, submit };
};

export type FactsModule = ReturnType<typeof makeFactsModule>;

export class CatalogFacts extends Context.Service<CatalogFacts, FactsModule>()(
  "@lootlog/catalog/CatalogFacts",
) {
  static readonly layer = Layer.effect(
    CatalogFacts,
    Effect.gen(function* () {
      const database = yield* CatalogDatabase;

      return CatalogFacts.of(makeFactsModule(database));
    }),
  );
}
