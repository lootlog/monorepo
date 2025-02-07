import React, { createContext, useReducer } from "react";

type Props = {
  children: React.ReactNode;
};

type CreateGuildModalAction =
  | {
      type: "OPEN";
    }
  | { type: "CLOSE" };

type CreateGuildModalState = {
  isOpen: boolean;
};

export type GlobalContextProviderValue = {
  createGuildModal: {
    state: CreateGuildModalState;
    dispatch: React.Dispatch<CreateGuildModalAction>;
  };
};

const CREATE_GUILD_MODAL_INITIAL_STATE = {
  isOpen: false,
};

const createGuildModalReducer = (
  state: CreateGuildModalState,
  action: CreateGuildModalAction
): CreateGuildModalState => {
  switch (action.type) {
    case "OPEN":
      return {
        isOpen: true,
      };
    case "CLOSE":
      return {
        isOpen: false,
      };
    default:
      return state;
  }
};

export const GlobalContextProvider: React.FC<Props> = ({ children }) => {
  const [reservationsModalState, reservationsModalDispatch] = useReducer(
    createGuildModalReducer,
    CREATE_GUILD_MODAL_INITIAL_STATE
  );

  const value = {
    createGuildModal: {
      state: reservationsModalState,
      dispatch: reservationsModalDispatch,
    },
  };

  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  );
};

export const GlobalContext = createContext<GlobalContextProviderValue>(
  {} as GlobalContextProviderValue
);
GlobalContext.displayName = "GlobalContext";
