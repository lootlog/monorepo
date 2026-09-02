import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared/decorators";
import { ForbiddenException } from "@nestjs/common";
import { roleTable } from "#src/database/drizzle/schema";

type Role = typeof roleTable.$inferSelect;

export const MemberRoles = createRequiredRequestValueDecorator<Role[]>({
  createException: () => new ForbiddenException(),
  getValue: (request) => request.roles as Role[] | undefined,
});
