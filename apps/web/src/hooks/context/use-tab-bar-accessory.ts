import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useHeaderSlot } from "@/hooks/context/use-header-slot";

/**
 * Where a page renders its phone accessory, such as its filters, into the tab
 * bar. `null` where the shell has no tab bar or from `md` up, where it is
 * hidden, so the page falls back to its own control.
 */
export const useTabBarAccessory = () => {
  const accessory = useHeaderSlot("accessory");
  const isMobile = useIsMobile();

  return isMobile ? accessory : null;
};
