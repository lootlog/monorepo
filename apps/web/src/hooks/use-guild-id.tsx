import { matchPath, useLocation, useSearchParams } from "react-router-dom";

export const useGuildId = () => {
  const location = useLocation();
  const match = matchPath({ path: "/:id/*" }, location.pathname);
  const [params] = useSearchParams();
  const guildIdFromPath = match?.params.id;
  const guildIdFromSearchParams = params.get("guild_id");

  const guildId = guildIdFromSearchParams ?? guildIdFromPath ?? undefined;

  return guildId;
};
