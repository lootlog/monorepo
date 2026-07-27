import { useLayoutEffect, type ReactNode } from "react";

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  useLayoutEffect(() => {
    const root = document.getElementById("lootlog-root");
    root?.classList.remove("light");
    root?.classList.add("dark-theme");
  }, []);

  return children;
}
