import { createRequiredUnauthorizedRequestValueDecorator } from "./create-required-unauthorized-request-value.decorator";

export const DiscordId = createRequiredUnauthorizedRequestValueDecorator(
  (request) => request.discordId,
);
