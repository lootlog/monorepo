import type { Pool, PoolClient } from "pg";

export async function withPostgresTransaction<Result>(
  postgres: Pool,
  operation: (transaction: PoolClient) => Promise<Result>,
): Promise<Result> {
  const transaction = await postgres.connect();
  try {
    await transaction.query("BEGIN");
    const result = await operation(transaction);
    await transaction.query("COMMIT");
    return result;
  } catch (error) {
    await transaction.query("ROLLBACK");
    throw error;
  } finally {
    transaction.release();
  }
}
