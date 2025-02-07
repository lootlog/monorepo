import { useSession } from "hooks/auth/use-session";

export const useUser = () => {
  const { data: session, isPending } = useSession();

  return { user: session?.user, isPending };
};
