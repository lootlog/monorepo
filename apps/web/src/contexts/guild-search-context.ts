import { createContext, type Dispatch, type SetStateAction } from "react";

export const GuildSearchContext = createContext<Dispatch<
  SetStateAction<boolean>
> | null>(null);
