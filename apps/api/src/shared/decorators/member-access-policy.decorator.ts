import type { AccessPolicy } from "@lootlog/access-policy";
import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared/decorators";
import { ForbiddenException } from "@nestjs/common";

export const MemberAccessPolicy =
  createRequiredRequestValueDecorator<AccessPolicy>({
    createException: () => new ForbiddenException(),
    getValue: (request) => request.accessPolicy as AccessPolicy | undefined,
  });
