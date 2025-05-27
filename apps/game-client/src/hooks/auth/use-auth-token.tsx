import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";

export const useAuthToken = () => {
  const [token, setToken] = useState<string | null>(null);

  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      getAccessTokenSilently().then((token) => {
        setToken(token);
      });
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return token;
};
