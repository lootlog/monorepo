import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from 'generated/client';

export const MemberRoles = createParamDecorator(function (
  data: unknown,
  ctx: ExecutionContext,
) {
  const request = ctx.switchToHttp().getRequest();

  if (!request.roles) {
    throw new ForbiddenException();
  }

  return request.roles as Role[];
});
