import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";
import { logger } from "../config/winston.config.js";
import type { BattlelogAppConfig } from "../config/env.js";
import { BattlesService } from "./battles.service.js";
import { DELETE_USER_BATTLES_QUEUE } from "./constants/delete-user-battles-queue.constant.js";

export interface DeleteUserBattlesJobData {
  userId: string;
}

type RedisConfig = BattlelogAppConfig["redis"];

export function getBullMqConnection(
  redisConfig: RedisConfig,
): ConnectionOptions {
  return {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    username: redisConfig.username,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export function createDeleteUserBattlesQueue(redisConfig: RedisConfig) {
  return new Queue<DeleteUserBattlesJobData>(DELETE_USER_BATTLES_QUEUE, {
    connection: getBullMqConnection(redisConfig),
    prefix: "{bull}",
  });
}

export function createDeleteUserBattlesWorker(
  redisConfig: RedisConfig,
  battlesService: BattlesService,
) {
  const serviceLogger = logger.child({
    context: "DeleteUserBattlesWorker",
  });

  const worker = new Worker<DeleteUserBattlesJobData>(
    DELETE_USER_BATTLES_QUEUE,
    async (job: Job<DeleteUserBattlesJobData>) => {
      const { userId } = job.data;

      serviceLogger.info("Processing delete-user-battles job", { userId });
      const result = await battlesService.deleteUserBattles(userId);
      serviceLogger.info("Completed delete-user-battles job", {
        userId,
        deletedCount: result.deletedCount,
      });
    },
    {
      connection: getBullMqConnection(redisConfig),
      prefix: "{bull}",
    },
  );

  worker.on("failed", (job, error) => {
    serviceLogger.error("Delete-user-battles job failed", {
      jobId: job?.id,
      userId: job?.data.userId,
      error,
    });
  });

  return worker;
}

export { DELETE_USER_BATTLES_QUEUE };
