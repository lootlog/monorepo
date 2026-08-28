import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared/decorators";
import { ForbiddenException } from "@nestjs/common";
import type { Role } from "src/db/domain";

export const MemberRoles = createRequiredRequestValueDecorator<Role[]>({
  createException: () => new ForbiddenException(),
  getValue: (request) => request.roles as Role[] | undefined,
});
