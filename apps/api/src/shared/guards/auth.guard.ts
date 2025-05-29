import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      const discordId = request.headers['x-auth-discord-id'];
      const userId = request.headers['x-auth-user-id'];

      console.log(request.headers);

      if (!discordId || !userId) {
        throw new UnauthorizedException();
      }

      request.userId = userId;
      request.discordId = discordId;

      return true;
    } catch (error) {
      throw error;
    }
  }
}
