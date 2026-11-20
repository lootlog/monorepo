import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import { useGateway } from "@/hooks/utils/use-gateway";
import { useHeroSightingsSocket } from "./use-hero-sightings-socket";

/** Keeps every accessible Organization's cached hero sightings current from the gateway. */
export const HeroSightingsSocketSubscription = () => {
  const { socket } = useGateway();
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();

  useHeroSightingsSocket({ socket, guilds });

  return null;
};
