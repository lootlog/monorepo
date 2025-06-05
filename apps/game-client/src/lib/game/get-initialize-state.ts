import { GameInterface } from "@/store/global.store";

export const getInitializeState = (interfaceName: GameInterface) => {
  return interfaceName === "ni"
    ? window.Engine?.interface?.alreadyInitialised ||
        window.Engine?.interface?.getAlreadyInitialised?.()
    : window.g?.init === 5;
};
