import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared";
import { ForbiddenException } from "@nestjs/common";
import type { Role } from "prisma/generated/client";

export const MemberRoles = createRequiredRequestValueDecorator<Role[]>({
  createException: () => new ForbiddenException(),
  getValue: (request) => request.roles as Role[] | undefined,
});
