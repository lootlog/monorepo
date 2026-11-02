import type { Job } from "bullmq";
import { Effect } from "effect";
import { ContextLogger } from "@lootlog/instrumentation";
import type { Battles } from "#src/battles/battles.service";

export interface DeleteUserBattlesJobData {
  userId: string;
}

export const makeDeleteUserBattlesProcessor = (
  battles: Pick<Battles, "deleteUserBattles">,
) => {
  const logger = new ContextLogger("DeleteUserBattlesProcessor");

  const process = (job: Job<DeleteUserBattlesJobData>) =>
    Effect.gen(function* () {
      const { userId } = job.data;
      logger.info(`Processing delete-user-battles job for user ${userId}`);
      const result = yield* battles.deleteUserBattles(userId);
      logger.info(
        `Completed delete-user-battles job for user ${userId}: ${result.deletedCount} battles deleted`,
      );
    }).pipe(
      Effect.withSpan("DeleteUserBattlesProcessor_process", {
        attributes: { adapter: "bullmq", retryCount: 0 },
      }),
    );

  return { process };
};

export type DeleteUserBattlesProcessor = ReturnType<
  typeof makeDeleteUserBattlesProcessor
>;
