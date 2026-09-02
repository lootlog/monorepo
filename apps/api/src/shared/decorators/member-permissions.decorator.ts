import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared/decorators";
import { ForbiddenException } from "@nestjs/common";
import type { Permission } from "@lootlog/schema/permissions";

export const MemberPermissions = createRequiredRequestValueDecorator<
  Permission[]
>({
  createException: () => new ForbiddenException(),
  getValue: (request) => request.permissions as Permission[] | undefined,
});
