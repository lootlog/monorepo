import { createContext, type Dispatch } from "react";

export type CreateGuildModalAction =
  | {
      type: "OPEN";
    }
  | { type: "CLOSE" };

export type CreateGuildModalState = {
  isOpen: boolean;
};

export type GlobalContextProviderValue = {
  createGuildModal: {
    state: CreateGuildModalState;
    dispatch: Dispatch<CreateGuildModalAction>;
  };
  installAddonModal: {
    state: CreateGuildModalState;
    dispatch: Dispatch<CreateGuildModalAction>;
  };
};

export const GlobalContext = createContext<
  GlobalContextProviderValue | undefined
>(undefined);

GlobalContext.displayName = "GlobalContext";
