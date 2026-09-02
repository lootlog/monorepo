import type { Queue } from "bullmq";
import { Schema } from "effect";
import type { DeleteUserBattlesJobData } from "./delete-user-battles.processor.js";

export const DeleteUserDataSchema = Schema.Struct({ userId: Schema.String });
export type DeleteUserData = typeof DeleteUserDataSchema.Type;

export class InternalController {
  constructor(
    private readonly deleteUserBattlesQueue: Queue<DeleteUserBattlesJobData>,
  ) {}

  async deleteUserData(body: DeleteUserData) {
    await this.deleteUserBattlesQueue.add("delete-user-battles", {
      userId: body.userId,
    });
    return { status: "ACCEPTED" as const };
  }
}
