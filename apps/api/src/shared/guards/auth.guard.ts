import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AUTH0_USER_ID_PREFIX } from 'src/config/auth0.config';
import { decodeJwtPayload } from 'src/shared/utils/decode-jwt-payload';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      const token = request.headers.authorization;

      if (!token) {
        throw new UnauthorizedException();
      }

      const parsedPayload = decodeJwtPayload(token);
      const userId = parsedPayload.sub?.replace(AUTH0_USER_ID_PREFIX, '');

      if (!userId) {
        throw new UnauthorizedException();
      }

      request.userId = userId;

      return true;
    } catch (error) {
      throw error;
    }
  }
}
