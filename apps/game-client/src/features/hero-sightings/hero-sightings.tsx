import { HeroSightingsWindow } from "@/features/hero-sightings/hero-sightings-window";
import { useHeroSightingsSocket } from "@/features/hero-sightings/hooks/use-hero-sightings-socket";
import { useTimersWorld } from "@/features/timers/hooks/use-timers-world";
import { useHeroSightings } from "@/hooks/api/use-hero-sightings";
import { useWindowOpen } from "@/hooks/ui/use-window-open";
import { useWindowPresence } from "@/hooks/ui/use-window-presence";

export const HeroSightings = () => {
  useHeroSightingsSocket();

  const { world } = useTimersWorld();
  useHeroSightings(world);

  const open = useWindowOpen("hero-sightings");
  const { shouldRender } = useWindowPresence(open);

  return shouldRender ? <HeroSightingsWindow isOpen={open} /> : null;
};
