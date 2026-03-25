import { authClient } from "@/lib/auth-client";

let messageSent = false;

export const useSession = () => {
  const session = authClient.useSession();

  if (!session.data && !session.isPending && !messageSent) {
    messageSent = true;
    window.message("Nie jesteś zalogowany, zaloguj się, aby załadować dodatek");
  }

  return session;
};
