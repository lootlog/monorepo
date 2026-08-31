import type { FieldOutputTypes } from "../../prisma/contract.js";
import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared/decorators";
import { ForbiddenException } from "@nestjs/common";

type Role = FieldOutputTypes["public"]["Role"];

export const MemberRoles = createRequiredRequestValueDecorator<Role[]>({
  createException: () => new ForbiddenException(),
  getValue: (request) => request.roles as Role[] | undefined,
});
