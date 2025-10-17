import { authClient } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";

export const useDiscordIdpToken = () => {
  const query = useQuery({
    queryKey: ["discord-idp-token"],
    queryFn: () =>
      authClient.getAccessToken({
        providerId: "discord",
      }),
    select: (response) => response.data?.accessToken,
  });

  return query;
};
