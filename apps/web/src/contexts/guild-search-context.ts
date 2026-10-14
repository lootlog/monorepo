import { createContext, type Dispatch, type SetStateAction } from "react";

/**
 * Whether the Organization search palette is open. The shell owns it, so the
 * top bar renders the search button and the route below renders the palette.
 */
export type GuildSearchState = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

export const GuildSearchContext = createContext<GuildSearchState>({
  isOpen: false,
  setIsOpen: () => {},
});
