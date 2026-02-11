import type { GameClientAddon, GameClientComponentAddon } from "@/addons/types";
import { useAddonPlayersGlow } from "@/features/online-players/hooks/use-addon-players-glow";

const OnlinePlayersGlowMount: GameClientComponentAddon["Mount"] = ({
  enabled,
}) => {
  useAddonPlayersGlow(enabled);
  return null;
};

const onlinePlayersGlowAddon: GameClientAddon = {
  id: "online-players-glow",
  name: "Online Players Glow",
  description: "Podswietla graczy online, ktorzy uzywaja addonu Lootlog.",
  order: 100,
  defaultEnabled: true,
  alwaysEnabled: true,
  interfaces: ["ni"],
  Mount: OnlinePlayersGlowMount,
};

export default onlinePlayersGlowAddon;
