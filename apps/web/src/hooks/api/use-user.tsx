import { useSession } from "@/hooks/auth/use-session";
import {
  useUserPreferences,
  UserPreferences,
} from "@/hooks/api/use-user-preferences";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  firstName?: string;
  lastName?: string;
  discordId: string;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type User = SessionUser & {
  preferences?: UserPreferences;
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
