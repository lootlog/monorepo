import { useAuthScopes } from "@/hooks/auth/use-auth-scopes";
import { authClient } from "@/lib/auth-client";
import { DISCORD_AUTH_SCOPES } from "@lootlog/types";

let messageSent = false;
let scopeMessageSent = false;

export const useSession = () => {
  const session = authClient.useSession();
  const { data: scopes, isPending } = useAuthScopes();

  const hasRequiredScopes = DISCORD_AUTH_SCOPES.every((scope) =>
    scopes?.includes(scope),
  );

  if (!session.data && !session.isPending && !messageSent) {
    messageSent = true;
    window.message("Nie jesteś zalogowany, zaloguj się, aby załadować dodatek");
  }

  if (!hasRequiredScopes && !isPending && !scopeMessageSent) {
    scopeMessageSent = true;
    window.message(
      "Brak wymaganych uprawnień, zaloguj się ponownie, aby załadować dodatek",
    );
  }

  return session;
};
