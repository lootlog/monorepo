import {
  getUsersControllerGetUserPreferencesQueryKey,
  useUsersControllerGetUserPreferences,
  type UsersControllerGetUserPreferencesQueryResult,
} from "@lootlog/api-client/react-query/main/users";
import { useSession, type SessionData } from "@/hooks/auth/use-session";

export type SessionUser = NonNullable<SessionData>["user"];
export type UserPreferences = UsersControllerGetUserPreferencesQueryResult;

export type User = SessionUser & {
  preferences?: UserPreferences;
};

export const useUser = () => {
  const { data: session, isPending: sessionPending } = useSession();
  const { data: preferences, isLoading: preferencesLoading } =
    useUsersControllerGetUserPreferences({
      query: {
        enabled: !!session?.user,
        queryKey: getUsersControllerGetUserPreferencesQueryKey(),
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
