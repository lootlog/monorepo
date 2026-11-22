import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import { useGateway } from "@/hooks/utils/use-gateway";
import { useHeroSightingsSocket } from "./use-hero-sightings-socket";

export const HeroSightingsSocketSubscription = () => {
  const { socket } = useGateway();
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();

  useHeroSightingsSocket({ socket, guilds });

  return null;
};
