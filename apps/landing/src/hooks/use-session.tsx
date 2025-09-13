import { authClient } from "@/src/lib/auth-client";

type UseSessionReturn = ReturnType<typeof authClient.useSession>;

export const useSession: () => UseSessionReturn = () => {
  return authClient.useSession();
};
