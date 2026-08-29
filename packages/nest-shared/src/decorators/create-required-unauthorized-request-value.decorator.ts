import { UnauthorizedException } from "@nestjs/common";

import {
  createRequiredRequestValueDecorator,
  type RequestLike,
} from "./create-required-request-value.decorator.js";

export function createRequiredUnauthorizedRequestValueDecorator<Value>(
  getValue: (request: RequestLike) => Value | null | undefined,
) {
  return createRequiredRequestValueDecorator({
    createException: () => new UnauthorizedException(),
    getValue,
  });
}
