import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";

@Injectable()
export class BattleAccessGuard implements CanActivate {
  constructor(private readonly drizzle: DrizzleService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.userId;
    const battleId = request.params.battleId;

    if (!userId) {
      throw new ForbiddenException("User not authenticated");
    }

    if (!battleId) {
      throw new ForbiddenException("Battle ID is required");
    }

    const battle = await this.drizzle.db.query.battles.findFirst({
      where: { id: battleId },
      columns: { userId: true, public: true },
    });

    if (!battle) {
      throw new NotFoundException(`Battle with ID ${battleId} not found`);
    }

    if (battle.public || battle.userId === userId) {
      return true;
    }

    throw new ForbiddenException(
      "Access denied: Battle is private and you are not the owner",
    );
  }
}
