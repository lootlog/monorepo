import React, { createContext, useReducer } from "react";

type Props = {
  children: React.ReactNode;
};

type ModalAction = { type: "OPEN" } | { type: "CLOSE" };

type ModalState = {
  isOpen: boolean;
};

export type GlobalContextProviderValue = {
  createGuildModal: {
    state: ModalState;
    dispatch: React.Dispatch<ModalAction>;
  };
  installAddonModal: {
    state: ModalState;
    dispatch: React.Dispatch<ModalAction>;
  };
};

const modalReducer = (state: ModalState, action: ModalAction): ModalState => {
  switch (action.type) {
    case "OPEN":
      return { isOpen: true };
    case "CLOSE":
      return { isOpen: false };
    default:
      return state;
  }
};

export const GlobalContextProvider: React.FC<Props> = ({ children }) => {
  const [reservationsModalState, reservationsModalDispatch] = useReducer(
    modalReducer,
    { isOpen: false },
  );
  const [installAddonModalState, installAddonModalDispatch] = useReducer(
    modalReducer,
    { isOpen: false },
  );

  const value = {
    createGuildModal: {
      state: reservationsModalState,
      dispatch: reservationsModalDispatch,
    },
    installAddonModal: {
      state: installAddonModalState,
      dispatch: installAddonModalDispatch,
    },
  };

  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  );
};

export const GlobalContext = createContext<GlobalContextProviderValue>(
  {} as GlobalContextProviderValue,
);
GlobalContext.displayName = "GlobalContext";
