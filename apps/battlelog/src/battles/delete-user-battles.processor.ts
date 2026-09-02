import type { Job } from "bullmq";
import { Logger } from "#src/platform/logger";
import { BattlesService } from "./battles.service.js";

export interface DeleteUserBattlesJobData {
  userId: string;
}

export class DeleteUserBattlesProcessor {
  private readonly logger = new Logger(DeleteUserBattlesProcessor.name);

  constructor(private readonly battlesService: BattlesService) {}

  async process(job: Job<DeleteUserBattlesJobData>): Promise<void> {
    const { userId } = job.data;

    this.logger.log(`Processing delete-user-battles job for user ${userId}`);

    const result = await this.battlesService.deleteUserBattles(userId);

    this.logger.log(
      `Completed delete-user-battles job for user ${userId}: ${result.deletedCount} battles deleted`,
    );
  }
}
