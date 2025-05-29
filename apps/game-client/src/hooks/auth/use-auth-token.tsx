import { useSession } from "@/hooks/auth/use-session";
import { useEffect, useState } from "react";

export const useAuthToken = () => {
  const [token, setToken] = useState<string | null>(null);

  const session = useSession();
  const isAuthenticated = !!session.data;
  const sessionToken = session.data?.session.token;

  useEffect(() => {
    if (isAuthenticated) {
      fetch("http://localhost/api/auth/idp/token", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })
        .then((response) => response.json())
        .then((data) => setToken(data.token));
    }
  }, [isAuthenticated]);

  return token;
};
