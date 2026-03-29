import { Body, Controller, Post } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { DELETE_USER_BATTLES_QUEUE } from "./constants/delete-user-battles-queue.constant";
import type { DeleteUserBattlesJobData } from "./delete-user-battles.processor";

class DeleteUserDataDto {
  userId: string;
}

@Controller("internal")
export class InternalController {
  constructor(
    @InjectQueue(DELETE_USER_BATTLES_QUEUE)
    private readonly deleteUserBattlesQueue: Queue<DeleteUserBattlesJobData>,
  ) {}

  @Post("/delete-user-data")
  async deleteUserData(@Body() body: DeleteUserDataDto) {
    await this.deleteUserBattlesQueue.add("delete-user-battles", {
      userId: body.userId,
    });

    return { status: "ACCEPTED" };
  }
}
