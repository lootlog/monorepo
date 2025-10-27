import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/modules/prisma/prisma.service';

@Injectable()
export class BattleOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.userId; // Set by AuthGuard
    const battleId = request.params.battleId;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!battleId) {
      throw new ForbiddenException('Battle ID is required');
    }

    try {
      const battle = await this.prisma.battle.findUniqueOrThrow({
        where: { id: battleId },
        select: { userId: true },
      });

      if (battle.userId !== userId) {
        throw new ForbiddenException('You can only modify your own battles');
      }

      return true;
    } catch (error) {
      if (error.name === 'NotFoundError') {
        throw new NotFoundException(`Battle with ID ${battleId} not found`);
      }
      throw error;
    }
  }
}
