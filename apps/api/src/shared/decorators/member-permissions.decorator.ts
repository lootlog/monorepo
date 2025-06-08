import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Permission } from 'generated/client';

export const MemberPermissions = createParamDecorator(function (
  data: unknown,
  ctx: ExecutionContext,
) {
  const request = ctx.switchToHttp().getRequest();

  if (!request.permissions) {
    throw new ForbiddenException();
  }

  return request.permissions as Permission[];
});
