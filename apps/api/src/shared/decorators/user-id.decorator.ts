import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const UserId = createParamDecorator(function (
  data: unknown,
  ctx: ExecutionContext,
) {
  const request = ctx.switchToHttp().getRequest();

  if (!request.userId) {
    throw new UnauthorizedException();
  }

  return request.userId;
});
