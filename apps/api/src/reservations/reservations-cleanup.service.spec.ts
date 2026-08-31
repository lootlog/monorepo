import type { PrismaDb } from "#src/db/prisma.provider";
import { ReservationsCleanupService } from "./reservations-cleanup.service.js";

describe("ReservationsCleanupService", () => {
  it("returns the Prisma affected-row count", async () => {
    const execute = vi.fn().mockResolvedValue({ affectedRows: 4 });
    const build = vi.fn(() => ({ kind: "cleanup" }));
    const affectedCount = vi.fn(() => ({ build }));
    const prisma = {
      raw: { sql: vi.fn(() => ({ affectedCount })) },
      runtime: vi.fn(() => ({ execute })),
    } as unknown as PrismaDb;
    const service = new ReservationsCleanupService(prisma);

    await expect(service.cleanupExpiredReservationsManual(30)).resolves.toBe(4);
    expect(execute).toHaveBeenCalledWith({ kind: "cleanup" });
  });
});
