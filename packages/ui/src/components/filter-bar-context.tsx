import { createContext, useContext } from "react";

/**
 * True inside a page's filter bar, where filters render as chips. The same
 * filters stacked in a panel or drawer keep their full-width fields.
 */
export const FilterBarContext = createContext(false);

export const useInFilterBar = () => useContext(FilterBarContext);
