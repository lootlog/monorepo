import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared";
import { ForbiddenException } from "@nestjs/common";
import type { Permission } from "prisma/generated/client";

export const MemberPermissions = createRequiredRequestValueDecorator<
  Permission[]
>({
  createException: () => new ForbiddenException(),
  getValue: (request) => request.permissions as Permission[] | undefined,
});
