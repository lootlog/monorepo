import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { DELETE_USER_BATTLES_QUEUE } from "./constants/delete-user-battles-queue.constant";
import { BattlesService } from "./battles.service";

export interface DeleteUserBattlesJobData {
  userId: string;
}

@Injectable()
@Processor(DELETE_USER_BATTLES_QUEUE)
export class DeleteUserBattlesProcessor extends WorkerHost {
  private readonly logger = new Logger(DeleteUserBattlesProcessor.name);

  constructor(private readonly battlesService: BattlesService) {
    super();
  }

  async process(job: Job<DeleteUserBattlesJobData>): Promise<void> {
    const { userId } = job.data;

    this.logger.log(`Processing delete-user-battles job for user ${userId}`);

    const result = await this.battlesService.deleteUserBattles(userId);

    this.logger.log(
      `Completed delete-user-battles job for user ${userId}: ${result.deletedCount} battles deleted`,
    );
  }
}
