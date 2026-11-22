import { createContext, type Dispatch, type SetStateAction } from "react";

export type GuildSearchState = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

export const GuildSearchContext = createContext<GuildSearchState>({
  isOpen: false,
  setIsOpen: () => {},
});
