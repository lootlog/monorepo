import { Body, Controller, Post } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { z } from "zod";
import { createZodDto, ZodResponse } from "nestjs-zod";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DELETE_USER_BATTLES_QUEUE } from "./constants/delete-user-battles-queue.constant";
import type { DeleteUserBattlesJobData } from "./delete-user-battles.processor";
import { BattleAcceptedResponseDto } from "./dto/battle-response.dto";

const DeleteUserDataSchema = z.object({ userId: z.string() });
class DeleteUserDataDto extends createZodDto(DeleteUserDataSchema) {}

@ApiTags("internal")
@Controller("internal")
export class InternalController {
  constructor(
    @InjectQueue(DELETE_USER_BATTLES_QUEUE)
    private readonly deleteUserBattlesQueue: Queue<DeleteUserBattlesJobData>,
  ) {}

  @Post("/delete-user-data")
  @ApiOperation({ summary: "Queue battle data deletion for a user" })
  @ZodResponse({
    status: 201,
    type: BattleAcceptedResponseDto,
  })
  async deleteUserData(@Body() body: DeleteUserDataDto) {
    await this.deleteUserBattlesQueue.add("delete-user-battles", {
      userId: body.userId,
    });

    return { status: "ACCEPTED" as const };
  }
}
