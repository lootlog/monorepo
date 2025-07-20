import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'src/gateway/types/socket-user.type';

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user.sub;
  },
);

export const WsDiscordId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const wsCtx = ctx.switchToWs();
    const client = wsCtx.getClient() as Socket;

    if (!client.data) {
      client.disconnect();
      throw new WsException('Unauthorized');
    }

    return client.data.discordId;
  },
);

export const WsUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const wsCtx = ctx.switchToWs();
    const client = wsCtx.getClient() as Socket;

    if (!client.data) {
      client.disconnect();
      throw new WsException('Unauthorized');
    }

    return client.data.userId;
  },
);
