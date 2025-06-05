import { GameInterface } from "@/store/global.store";

export const getWorldName = (gameInterface: GameInterface) => {
  return gameInterface === "ni"
    ? window.Engine?.worldConfig?.getWorldName()
    : window.g?.worldConfig?.getWorldName();
};
