import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import type { Socket } from "#src/gateway/types/socket-user.type";

type IdentityField = "discordId" | "userId";

export function getRequiredSocketIdentity(
  client: Socket,
  field: IdentityField,
): string {
  const value: unknown = client.data?.[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    client.disconnect();
    throw new WsException("Unauthorized");
  }

  return value;
}

export const WsDiscordId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const wsCtx = ctx.switchToWs();
    const client = wsCtx.getClient() as Socket;

    return getRequiredSocketIdentity(client, "discordId");
  },
);

export const WsUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const wsCtx = ctx.switchToWs();
    const client = wsCtx.getClient() as Socket;

    return getRequiredSocketIdentity(client, "userId");
  },
);
