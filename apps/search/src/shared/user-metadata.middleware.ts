import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

type SearchRequest = FastifyRequest["raw"] & {
  userId?: string | null;
  discordId?: string | null;
};

function getHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

@Injectable()
export class UserMetadataMiddleware implements NestMiddleware {
  use(
    request: SearchRequest,
    _response: FastifyReply["raw"],
    next: () => void,
  ) {
    request.userId = getHeaderValue(request.headers["x-auth-user-id"]);
    request.discordId = getHeaderValue(request.headers["x-auth-discord-id"]);
    next();
  }
}
