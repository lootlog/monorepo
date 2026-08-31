import type { PrismaService } from "#src/db/prisma.service";
import { ReservationsCleanupService } from "./reservations-cleanup.service.js";

describe("ReservationsCleanupService", () => {
  it("returns the Prisma affected-row count", async () => {
    const execute = vi.fn().mockResolvedValue({ affectedRows: 4 });
    const build = vi.fn(() => ({ kind: "cleanup" }));
    const affectedCount = vi.fn(() => ({ build }));
    const db = {
      raw: { sql: vi.fn(() => ({ affectedCount })) },
      runtime: vi.fn(() => ({ execute })),
    };
    const prisma = { db } as unknown as PrismaService;
    const service = new ReservationsCleanupService(prisma);

    await expect(service.cleanupExpiredReservationsManual(30)).resolves.toBe(4);
    expect(execute).toHaveBeenCalledWith({ kind: "cleanup" });
  });
});
