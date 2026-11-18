import { createLootlogAuthClient } from "@lootlog/client/auth-session";
import { AUTH_SERVICE_URL } from "@/config/auth";

export const authClient = createLootlogAuthClient(AUTH_SERVICE_URL);
