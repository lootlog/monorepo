import {
  createParamDecorator,
  ForbiddenException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Member } from 'generated/client';

export const MemberData = createParamDecorator(function (
  data: unknown,
  ctx: ExecutionContext,
) {
  const request = ctx.switchToHttp().getRequest();

  if (!request.member) {
    throw new ForbiddenException();
  }

  return request.member as Member;
});
