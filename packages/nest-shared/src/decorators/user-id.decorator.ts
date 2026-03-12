import { UnauthorizedException } from "@nestjs/common";

import { createRequiredRequestValueDecorator } from "./create-required-request-value.decorator";

export const UserId = createRequiredRequestValueDecorator({
  createException: () => new UnauthorizedException(),
  getValue: (request) => request.userId,
});
