import { createLootlogAuthClient } from "@lootlog/client/auth-session";
import { configureApiClients } from "@lootlog/client/transport";
import { apiServiceOrigin } from "@lootlog/schema/api-services";
import { getPortalEnvironment } from "@/lib/environment";

export const createPortalSession = (hostname: string) => {
  const environment = getPortalEnvironment(hostname);
  const authOrigin = apiServiceOrigin("auth", environment);

  configureApiClients({
    auth: { baseUrl: authOrigin, credentials: "include" },
    main: {
      baseUrl: apiServiceOrigin("main", environment),
      credentials: "include",
    },
  });

  return createLootlogAuthClient(authOrigin);
};
