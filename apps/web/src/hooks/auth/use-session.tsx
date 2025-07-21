import { authClient } from "@/lib/auth-client";

export const useSession = () => {
  return authClient.useSession() as ReturnType<typeof authClient.useSession> & {
    data: {
      user: { discordId: string };
    };
  };
};
