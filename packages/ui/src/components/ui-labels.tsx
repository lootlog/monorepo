import { createContext, useContext, type ReactNode } from "react";

/** Text the primitives show or announce themselves, in the app's language. */
export interface UiLabels {
  close: string;
  sidebarTitle: string;
  sidebarDescription: string;
  toggleSidebar: string;
  commandPaletteTitle: string;
  commandPaletteDescription: string;
  pagination: string;
  previousPage: string;
  nextPage: string;
  previous: string;
  next: string;
  morePages: string;
}

const defaultLabels: UiLabels = {
  close: "Close",
  sidebarTitle: "Sidebar",
  sidebarDescription: "Displays the mobile sidebar.",
  toggleSidebar: "Toggle Sidebar",
  commandPaletteTitle: "Command Palette",
  commandPaletteDescription: "Search for a command to run...",
  pagination: "Pagination",
  previousPage: "Go to previous page",
  nextPage: "Go to next page",
  previous: "Previous",
  next: "Next",
  morePages: "More pages",
};

const UiLabelsContext = createContext<UiLabels>(defaultLabels);

/** Gives the primitives below it the app's translations of their own text. */
export function UiLabelsProvider({
  labels,
  children,
}: {
  labels: UiLabels;
  children: ReactNode;
}) {
  return <UiLabelsContext value={labels}>{children}</UiLabelsContext>;
}

export const useUiLabels = () => useContext(UiLabelsContext);
