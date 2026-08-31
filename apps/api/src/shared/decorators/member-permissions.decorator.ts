import { db as prismaDb } from "../../prisma/db.js";
import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared/decorators";
import { ForbiddenException } from "@nestjs/common";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

export const MemberPermissions = createRequiredRequestValueDecorator<
  Permission[]
>({
  createException: () => new ForbiddenException(),
  getValue: (request) => request.permissions as Permission[] | undefined,
});
