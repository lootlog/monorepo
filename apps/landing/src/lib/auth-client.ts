import { createLootlogAuthClient } from "@lootlog/client/auth-session";
import { apiServiceOrigin } from "@lootlog/schema/api-services";

export const authClient = createLootlogAuthClient(
  import.meta.env.VITE_AUTH_SERVICE_URL || apiServiceOrigin("auth", "local"),
);
