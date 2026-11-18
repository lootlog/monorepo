import { createLootlogAuthClient } from "@lootlog/client/auth-session";
import { configureApiClients } from "@lootlog/client/transport";
import { apiServiceOrigin } from "@lootlog/schema/api-services";
import { getPortalEnvironment } from "~/lib/environment";

/**
 * The signed-in session of the keys page: the auth client and the generated
 * session clients it manages keys with, all in the host's environment.
 */
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
