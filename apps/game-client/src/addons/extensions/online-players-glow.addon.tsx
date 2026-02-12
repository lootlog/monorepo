import type { GameClientAddon, GameClientComponentAddon } from "@/addons/types";
import { useOnlinePlayersGlowAddon } from "@/addons/extensions/online-players-glow/use-online-players-glow-addon";

const OnlinePlayersGlowMount: GameClientComponentAddon["Mount"] = ({
  enabled,
}) => {
  useOnlinePlayersGlowAddon(enabled);
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
