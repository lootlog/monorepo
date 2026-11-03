import { HeroSightingsWindow } from "@/features/hero-sightings/hero-sightings-window";
import { useHeroSightingsSocket } from "@/features/hero-sightings/hooks/use-hero-sightings-socket";
import { useTimersWorld } from "@/features/timers/hooks/use-timers-world";
import { useHeroSightings } from "@/hooks/api/use-hero-sightings";
import { useWindowPresence } from "@/hooks/ui/use-window-presence";
import { useWindowsStore } from "@/store/windows.store";

export const HeroSightings = () => {
  useHeroSightingsSocket();

  // Loaded while the window is closed too: hero timers show the map a hero
  // was detected on.
  const { world } = useTimersWorld();
  useHeroSightings(world);

  const open = useWindowsStore((state) => state["hero-sightings"].open);
  const { shouldRender } = useWindowPresence(open);

  return shouldRender ? <HeroSightingsWindow isOpen={open} /> : null;
};
