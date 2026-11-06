import {
  useUsersControllerGetUserPreferences,
  type UsersControllerGetUserPreferencesQueryResult,
} from "@lootlog/client/main";
import { useSession, type SessionData } from "@/hooks/auth/use-session";

type SessionUser = NonNullable<SessionData>["user"];

type UserPreferences = UsersControllerGetUserPreferencesQueryResult;

type User = SessionUser & {
  preferences?: UserPreferences;
};

export const useUser = () => {
  const { data: session, isPending: sessionPending } = useSession();

  const { data: preferences, isLoading: preferencesLoading } =
    useUsersControllerGetUserPreferences({
      query: {
        enabled: !!session?.user,
        retry: 1,
      },
    });

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
