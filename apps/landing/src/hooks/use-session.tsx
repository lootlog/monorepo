import { authClient } from "@/src/lib/auth-client";

export const useSession = () => {
  return authClient.useSession();
};
