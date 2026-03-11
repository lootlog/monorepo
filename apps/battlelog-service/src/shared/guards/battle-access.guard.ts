import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { PrismaService } from "src/shared/modules/prisma/prisma.service";

@Injectable()
export class BattleAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

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

    try {
      const battle = await this.prisma.battle.findUniqueOrThrow({
        where: { id: battleId },
        select: { userId: true, public: true },
      });

      if (battle.public || battle.userId === userId) {
        return true;
      }

      throw new ForbiddenException(
        "Access denied: Battle is private and you are not the owner",
      );
    } catch (error) {
      if (error.name === "NotFoundError") {
        throw new NotFoundException(`Battle with ID ${battleId} not found`);
      }
      throw error;
    }
  }
}
