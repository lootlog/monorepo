import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { authenticateHeaders } from "@lootlog/api-helpers";

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = await authenticateHeaders({
      headers: request.headers,
      authServiceUrl: process.env.AUTH_SERVICE_URL,
      forwardedAuthSecret: process.env.FORWARDED_AUTH_SIGNATURE_SECRET,
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    request.userId = user.userId;
    request.discordId = user.discordId;

    return true;
  }
}
