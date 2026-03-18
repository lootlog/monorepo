import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";

@Injectable()
export class BattleOwnerGuard implements CanActivate {
  constructor(private readonly drizzle: DrizzleService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.userId; // Set by AuthGuard
    const battleId = request.params.battleId;

    if (!userId) {
      throw new ForbiddenException("User not authenticated");
    }

    if (!battleId) {
      throw new ForbiddenException("Battle ID is required");
    }

    const battle = await this.drizzle.db.query.battles.findFirst({
      where: { id: battleId },
      columns: { userId: true },
    });

    if (!battle) {
      throw new NotFoundException(`Battle with ID ${battleId} not found`);
    }

    if (battle.userId !== userId) {
      throw new ForbiddenException("You can only modify your own battles");
    }

    return true;
  }
}
