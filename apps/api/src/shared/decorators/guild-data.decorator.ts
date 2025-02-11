import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Guild } from '@prisma/client';

export const GuildData = createParamDecorator(function (
  data: unknown,
  ctx: ExecutionContext,
) {
  const request = ctx.switchToHttp().getRequest();

  if (!request.guild) {
    throw new ForbiddenException();
  }

  return request.guild as Guild;
});
