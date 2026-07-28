import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export const useLogout = () => {
  const queryClient = useQueryClient();

  const logout = async () => {
    await authClient.signOut();
    queryClient.clear();
    window.location.replace("/");
  };

  return { logout };
};
