import { createRequiredUnauthorizedRequestValueDecorator } from "./create-required-unauthorized-request-value.decorator.js";

export const DiscordId = createRequiredUnauthorizedRequestValueDecorator(
  (request) => request.discordId,
);
