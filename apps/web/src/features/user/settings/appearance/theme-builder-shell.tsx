import { useLayoutEffect, useRef, type ReactNode } from "react";
import { PRESET_THEME_CONFIGS } from "@/themes/preset-configs";
import { applyThemeConfig, clearThemeConfig } from "@/themes/runtime";

interface ThemeBuilderShellProps {
  children: ReactNode;
}

export const ThemeBuilderShell = ({ children }: ThemeBuilderShellProps) => {
  const shellRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;
    applyThemeConfig(shell, PRESET_THEME_CONFIGS.default);
    return () => clearThemeConfig(shell);
  }, []);

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-[200] flex min-h-0 flex-col overflow-hidden bg-background text-foreground"
      data-theme-builder-shell
    >
      {children}
    </div>
  );
};
