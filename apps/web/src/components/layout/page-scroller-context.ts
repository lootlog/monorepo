import { createContext } from "react";

/**
 * The page viewport that a tabbed section's tabs share with their pages, for
 * lists under the tabs that virtualize their rows. `null` until it mounts,
 * and on phones, where the document scrolls instead.
 */
export const PageScrollerContext = createContext<HTMLDivElement | null>(null);
