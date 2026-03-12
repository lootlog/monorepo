import { createRequiredUnauthorizedRequestValueDecorator } from "./create-required-unauthorized-request-value.decorator";

export const UserId = createRequiredUnauthorizedRequestValueDecorator(
  (request) => request.userId,
);
