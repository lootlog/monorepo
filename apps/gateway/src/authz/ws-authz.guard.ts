import { ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WsException } from '@nestjs/websockets';

export class WsAuthzGuard extends AuthGuard('ws-jwt') {
  private readonly logger = new Logger(WsAuthzGuard.name);
  constructor() {
    super();
  }

  getRequest(context: ExecutionContext) {
    const ctx = context.switchToWs();
    const data = ctx.getData();

    return data;
  }

  handleRequest(err, user, info) {
    if (info) {
      this.logger.warn(info);
      throw new WsException('Unauthorized');
    }

    if (err || !user) {
      throw err || new WsException('Unauthorized');
    }

    return {
      ...user,
      sub: user.sub.replace('oauth2|Discord|', ''),
    };
  }
}
