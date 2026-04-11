import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import type { Socket } from "src/gateway/types/socket-user.type";

export const WsDiscordId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const wsCtx = ctx.switchToWs();
    const client = wsCtx.getClient() as Socket;

    if (!client.data) {
      client.disconnect();
      throw new WsException("Unauthorized");
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
      throw new WsException("Unauthorized");
    }

    return client.data.userId;
  },
);
