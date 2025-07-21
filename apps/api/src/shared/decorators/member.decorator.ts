import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const GuildMember = createParamDecorator(function (
  data: unknown,
  ctx: ExecutionContext,
) {
  const request = ctx.switchToHttp().getRequest();

  if (!request.member) {
    throw new UnauthorizedException();
  }

  return request.member;
});
