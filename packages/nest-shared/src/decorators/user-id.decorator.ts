import { createRequiredUnauthorizedRequestValueDecorator } from "./create-required-unauthorized-request-value.decorator.js";

export const UserId = createRequiredUnauthorizedRequestValueDecorator(
  (request) => request.userId,
);
