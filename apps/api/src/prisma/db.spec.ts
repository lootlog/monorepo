import { PrismaService } from "#src/db/prisma.service";
import { databaseQueryDiagnostics, setDatabaseQueryObserver } from "./db.js";

describe("database query diagnostics", () => {
  afterEach(() => {
    setDatabaseQueryObserver(undefined);
    vi.unstubAllEnvs();
  });

  it("forwards completed queries to performance diagnostics", async () => {
    vi.stubEnv("ENV", "production");
    const logSpan =
      vi.fn<
        (
          span: string,
          durationMs: number,
          metadata: Record<string, unknown>,
        ) => void
      >();
    new PrismaService({ logSpan } as never);
    const plan = { params: [], sql: "SELECT\n  1" } as never;

    databaseQueryDiagnostics.beforeQuery?.(plan, {} as never);
    await databaseQueryDiagnostics.afterQuery?.(plan, {} as never, {} as never);

    expect(logSpan).toHaveBeenCalledWith("prisma.query", expect.any(Number), {
      query: "SELECT 1",
    });
  });
});
