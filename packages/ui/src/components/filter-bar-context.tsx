import { createContext, useContext } from "react";

export const FilterBarContext = createContext(false);

export const useInFilterBar = () => useContext(FilterBarContext);
