import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export const useLogout = () => {
  const queryClient = useQueryClient();

  const [isPending, setIsPending] = useState(false);
  const attempt = useRef<Promise<void> | null>(null);

  const logout = () => {
    if (attempt.current) return attempt.current;
    setIsPending(true);
    attempt.current = Promise.resolve()
      .then(() => authClient.signOut())
      .then(() => {
        queryClient.clear();
        window.location.replace("/");
      })
      .finally(() => {
        attempt.current = null;
        setIsPending(false);
      });
    return attempt.current;
  };

  return { logout, isPending };
};
