import { useSession } from "@/hooks/auth/use-session";
import {
  useUserPreferences,
  UserPreferences,
} from "@/hooks/api/use-user-preferences";

export type User = {
  discordId: string;
  preferences?: UserPreferences;
  [key: string]: unknown;
};

export const useUser = () => {
  const { data: session, isPending: sessionPending } = useSession();
  const { data: preferences, isPending: preferencesPending } =
    useUserPreferences();

  const user: User | undefined = session?.user
    ? {
        ...session.user,
        preferences,
      }
    : undefined;

  return {
    user,
    isPending: sessionPending || preferencesPending,
  };
};
