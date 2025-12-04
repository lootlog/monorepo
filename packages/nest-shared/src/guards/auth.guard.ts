import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const discordId = request.headers["x-auth-discord-id"];
    const userId = request.headers["x-auth-user-id"];

    if (!discordId || !userId) {
      throw new UnauthorizedException();
    }

    request.userId = userId;
    request.discordId = discordId;

    return true;
  }
}
