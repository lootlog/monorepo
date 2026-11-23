import { useNavigate } from "@tanstack/react-router";
import type { UserAction } from "@/lib/user-action";
import { usePageAction } from "@/lib/use-page-action";
import { performUserAction } from "@/server/queries";

export function useUserAction(userId: string) {
  const navigate = useNavigate({ from: "/users/$userId" });

  return usePageAction<UserAction>(
    (action) => performUserAction({ data: { userId, action } }),
    (search) => navigate({ search, replace: true }),
  );
}
