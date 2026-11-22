import { useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { UserAction } from "@/lib/user-action";
import { performUserAction } from "@/server/queries";

export function useUserAction(userId: string) {
  const router = useRouter();
  const navigate = useNavigate({ from: "/users/$userId" });
  const [pending, setPending] = useState<UserAction["action"]>();

  const run = async (action: UserAction) => {
    setPending(action.action);

    try {
      await performUserAction({ data: { userId, action } });
      await router.invalidate();
      await navigate({ search: { notice: action.action }, replace: true });
    } catch {
      await navigate({ search: { error: "failed" }, replace: true });
    } finally {
      setPending(undefined);
    }
  };

  return { run, pending };
}
