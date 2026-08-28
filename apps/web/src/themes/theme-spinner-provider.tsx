import { SpinnerOverrideProvider } from "@lootlog/ui/components/spinner";
import { SurfaceDecorationProvider } from "@lootlog/ui/components/surface-decoration-provider";
import type { FC, ReactNode } from "react";
import { LazyCatPawSpinner } from "./cat/lazy-cat-paw-spinner";
import { LazyRukiaIceSpinner } from "./rukia/lazy-rukia-ice-spinner";
import { LazyRiasMagicSpinner } from "./rias/lazy-rias-magic-spinner";
import { ThemeSurfaceDecoration } from "./theme-surface-decoration";
import { useThemeMeta } from "./use-theme-meta";

export const ThemeSpinnerProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { isCatTheme, isRukiaTheme, isRiasTheme } = useThemeMeta();
  let spinner = null;

  if (isCatTheme) spinner = LazyCatPawSpinner;
  if (isRukiaTheme) spinner = LazyRukiaIceSpinner;
  if (isRiasTheme) spinner = LazyRiasMagicSpinner;

  return (
    <SurfaceDecorationProvider decoration={ThemeSurfaceDecoration}>
      <SpinnerOverrideProvider spinner={spinner}>
        {children}
      </SpinnerOverrideProvider>
    </SurfaceDecorationProvider>
  );
};
