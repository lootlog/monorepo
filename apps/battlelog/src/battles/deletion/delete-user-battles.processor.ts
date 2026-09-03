import type { Job } from "bullmq";
import { Effect } from "effect";
import { Logger } from "#src/infrastructure/logger";
import type { Battles } from "#src/battles/battles.service";

export interface DeleteUserBattlesJobData {
  userId: string;
}

export const makeDeleteUserBattlesProcessor = (
  battles: Pick<Battles, "deleteUserBattles">,
) => {
  const logger = new Logger("DeleteUserBattlesProcessor");

  const process = (job: Job<DeleteUserBattlesJobData>) =>
    Effect.gen(function* () {
      const { userId } = job.data;
      logger.log(`Processing delete-user-battles job for user ${userId}`);
      const result = yield* battles.deleteUserBattles(userId);
      logger.log(
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
