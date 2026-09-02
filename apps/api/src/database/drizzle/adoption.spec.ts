import { createHash } from "node:crypto";
import { describe, expect, it } from "bun:test";
import {
  adoptExistingApiDatabase,
  ApiDatabaseAdoptionError,
  type SqlTransactionClient,
} from "./adoption.js";
import {
  BASELINE_MIGRATION_CREATED_AT,
  BASELINE_MIGRATION_NAME,
  BASELINE_MIGRATION_SHA256,
  EXPECTED_API_CATALOG,
  EXPECTED_API_CATALOG_SHA256,
  LEGACY_MIGRATION_EVIDENCE_SHA256,
} from "./expected-catalog.js";

type Query = {
  readonly statement: string;
  readonly values?: ReadonlyArray<unknown>;
};

const expectedEnumRows = EXPECTED_API_CATALOG.enums.flatMap(
  ({ name, values }) => values.map((value) => ({ name, value })),
);

const makeClient = ({
  marker,
  journal = [],
  presenceBackfillViolations = "0",
  catalog = EXPECTED_API_CATALOG,
}: {
  readonly marker?: {
    readonly fingerprint: string;
    readonly migrationEvidenceHash: string;
  };
  readonly journal?: ReadonlyArray<{
    readonly hash: string;
    readonly createdAt: string;
    readonly name: string | null;
  }>;
  readonly presenceBackfillViolations?: string;
  readonly catalog?: {
    readonly tables: ReadonlyArray<string>;
    readonly columns: ReadonlyArray<Record<string, unknown>>;
    readonly enums: ReadonlyArray<{
      readonly name: string;
      readonly values: ReadonlyArray<string>;
    }>;
    readonly indexes: ReadonlyArray<string>;
    readonly constraints: ReadonlyArray<string>;
  };
} = {}) => {
  const queries: Query[] = [];
  const client: SqlTransactionClient = {
    async query(statement, values) {
      await Promise.resolve();
      queries.push({ statement, values });
      if (statement.includes("api-adoption:marker")) {
        return { rows: marker ? [marker] : [] };
      }
      if (statement.includes("api-adoption:migration-journal")) {
        return { rows: journal };
      }
      if (statement.includes("api-adoption:tables")) {
        return { rows: catalog.tables.map((name) => ({ name })) };
      }
      if (statement.includes("api-adoption:columns")) {
        return { rows: catalog.columns };
      }
      if (statement.includes("api-adoption:enums")) {
        const rows =
          catalog === EXPECTED_API_CATALOG
            ? expectedEnumRows
            : catalog.enums.flatMap(({ name, values: enumValues }) =>
                enumValues.map((value) => ({ name, value })),
              );
        return { rows };
      }
      if (statement.includes("api-adoption:indexes")) {
        return { rows: catalog.indexes.map((name) => ({ name })) };
      }
      if (statement.includes("api-adoption:constraints")) {
        return { rows: catalog.constraints.map((name) => ({ name })) };
      }
      if (statement.includes("api-adoption:presence-backfill")) {
        return { rows: [{ count: presenceBackfillViolations }] };
      }
      return { rows: [] };
    },
  };
  return { client, queries };
};

const hasBaselineInsert = (queries: ReadonlyArray<Query>) =>
  queries.some(({ statement }) =>
    statement.includes("INSERT INTO drizzle.__drizzle_migrations"),
  );

describe("adoptExistingApiDatabase", () => {
  it("records the Drizzle baseline only after the complete catalog matches", async () => {
    const { client, queries } = makeClient();

    await expect(adoptExistingApiDatabase(client)).resolves.toEqual({
      status: "adopted",
      fingerprint: EXPECTED_API_CATALOG_SHA256,
    });
    expect(hasBaselineInsert(queries)).toBe(true);
    expect(queries.at(-1)?.statement).toBe("COMMIT");
  });

  it("fails closed for a changed physical column and rolls back", async () => {
    const columns = EXPECTED_API_CATALOG.columns.map((column, index) =>
      index === 0 ? { ...column, formattedType: "character varying" } : column,
    );
    const { client, queries } = makeClient({
      catalog: { ...EXPECTED_API_CATALOG, columns },
    });

    await expect(adoptExistingApiDatabase(client)).rejects.toBeInstanceOf(
      ApiDatabaseAdoptionError,
    );
    expect(hasBaselineInsert(queries)).toBe(false);
    expect(queries.at(-1)?.statement).toBe("ROLLBACK");
  });

  it("fails closed for a partial legacy schema", async () => {
    const { client, queries } = makeClient({
      catalog: {
        ...EXPECTED_API_CATALOG,
        tables: EXPECTED_API_CATALOG.tables.slice(1),
      },
    });

    await expect(adoptExistingApiDatabase(client)).rejects.toThrow(
      "does not match the accepted legacy schema",
    );
    expect(hasBaselineInsert(queries)).toBe(false);
    expect(queries.at(-1)?.statement).toBe("ROLLBACK");
  });

  it("fails closed when the presence permission backfill is incomplete", async () => {
    const { client, queries } = makeClient({
      presenceBackfillViolations: "1",
    });

    await expect(adoptExistingApiDatabase(client)).rejects.toThrow(
      "presence permission backfill is incomplete",
    );
    expect(hasBaselineInsert(queries)).toBe(false);
    expect(queries.at(-1)?.statement).toBe("ROLLBACK");
  });

  it("rejects an unknown existing adoption marker before reading the catalog", async () => {
    const { client, queries } = makeClient({
      marker: {
        fingerprint: "unknown",
        migrationEvidenceHash: LEGACY_MIGRATION_EVIDENCE_SHA256,
      },
    });

    await expect(adoptExistingApiDatabase(client)).rejects.toThrow(
      "unknown Drizzle adoption marker",
    );
    expect(
      queries.some(({ statement }) =>
        statement.includes("api-adoption:tables"),
      ),
    ).toBe(false);
    expect(hasBaselineInsert(queries)).toBe(false);
    expect(queries.at(-1)?.statement).toBe("ROLLBACK");
  });

  it("rejects an unknown migration journal before writing an adoption marker", async () => {
    const { client, queries } = makeClient({
      journal: [{ hash: "unknown", createdAt: "0", name: "unknown" }],
    });

    await expect(adoptExistingApiDatabase(client)).rejects.toThrow(
      "unknown Drizzle migration journal",
    );
    expect(
      queries.some(({ statement }) =>
        statement.includes("api-adoption:tables"),
      ),
    ).toBe(false);
    expect(hasBaselineInsert(queries)).toBe(false);
    expect(queries.at(-1)?.statement).toBe("ROLLBACK");
  });

  it("accepts the exact baseline journal produced for a new database", async () => {
    const { client } = makeClient({
      journal: [
        {
          hash: BASELINE_MIGRATION_SHA256,
          createdAt: String(BASELINE_MIGRATION_CREATED_AT),
          name: BASELINE_MIGRATION_NAME,
        },
      ],
    });

    await expect(adoptExistingApiDatabase(client)).resolves.toEqual({
      status: "adopted",
      fingerprint: EXPECTED_API_CATALOG_SHA256,
    });
  });

  it("does not adopt an empty database", async () => {
    const { client, queries } = makeClient({
      catalog: { ...EXPECTED_API_CATALOG, tables: [] },
    });

    await expect(adoptExistingApiDatabase(client)).resolves.toEqual({
      status: "empty",
    });
    expect(hasBaselineInsert(queries)).toBe(false);
    expect(queries.at(-1)?.statement).toBe("COMMIT");
  });

  it("accepts only the known immutable adoption marker on later starts", async () => {
    const { client, queries } = makeClient({
      marker: {
        fingerprint: EXPECTED_API_CATALOG_SHA256,
        migrationEvidenceHash: LEGACY_MIGRATION_EVIDENCE_SHA256,
      },
    });

    await expect(adoptExistingApiDatabase(client)).resolves.toEqual({
      status: "already-adopted",
      fingerprint: EXPECTED_API_CATALOG_SHA256,
    });
    expect(
      queries.some(({ statement }) =>
        statement.includes("api-adoption:tables"),
      ),
    ).toBe(false);
    expect(hasBaselineInsert(queries)).toBe(false);
  });
});

describe("generated API database evidence", () => {
  it("keeps the expected catalog hash deterministic", () => {
    const hash = createHash("sha256")
      .update(JSON.stringify(EXPECTED_API_CATALOG))
      .digest("hex");
    expect(hash).toBe(EXPECTED_API_CATALOG_SHA256);
    expect(EXPECTED_API_CATALOG.tables).toHaveLength(60);
    expect(EXPECTED_API_CATALOG.columns).toHaveLength(600);
    expect(EXPECTED_API_CATALOG.enums).toHaveLength(25);
    expect(EXPECTED_API_CATALOG.indexes).toHaveLength(166);
    expect(EXPECTED_API_CATALOG.constraints).toHaveLength(136);
  });

  it("pins the baseline SQL and legacy migration evidence", async () => {
    const baseline = await Bun.file(
      new URL(
        "../../../drizzle/migrations/20260901121000_legacy_prisma_baseline/migration.sql",
        import.meta.url,
      ),
    ).text();
    const manifest = await Bun.file(
      new URL("../../../drizzle/legacy-prisma.sha256", import.meta.url),
    ).text();
    expect(createHash("sha256").update(baseline).digest("hex")).toBe(
      BASELINE_MIGRATION_SHA256,
    );
    expect(createHash("sha256").update(manifest).digest("hex")).toBe(
      LEGACY_MIGRATION_EVIDENCE_SHA256,
    );
  });
});
