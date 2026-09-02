import { Injectable } from "@nestjs/common";
import { lt } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import { reservationTable } from "#src/database/drizzle/schema";

@Injectable()
export class ReservationsCleanupRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async deleteExpired(cutoffDate: Date): Promise<number> {
    const deleted = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .delete(reservationTable)
          .where(lt(reservationTable.endsAt, cutoffDate))
          .returning({ id: reservationTable.id }),
      ),
    );
    return deleted.length;
  }
}
