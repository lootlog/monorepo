import {
  useUserPreferences,
  type UserPreferences,
} from "@/hooks/api/user/use-user-preferences";
import { useSession, type SessionData } from "@/hooks/auth/use-session";

export type SessionUser = NonNullable<SessionData>["user"];

export type User = SessionUser & {
  preferences?: UserPreferences;
};

export const useUser = () => {
  const { data: session, isPending: sessionPending } = useSession();
  const { data: preferences, isLoading: preferencesLoading } =
    useUserPreferences();

  const user: User | undefined = session?.user
    ? {
        ...session.user,
        preferences,
      }
    : undefined;

  return {
    user,
    isPending: sessionPending || preferencesLoading,
  };
};
