import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user.sub;
  },
);

export const WsDiscordId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const wsCtx = ctx.switchToWs();
    const client = wsCtx.getClient();

    if (!client.user) {
      client.disconnect();
      throw new WsException('Unauthorized');
    }

    return client.user.id;
  },
);
