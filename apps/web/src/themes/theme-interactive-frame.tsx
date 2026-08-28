import { lazy, Suspense, type ReactNode } from "react";
import { useThemeMeta } from "./use-theme-meta";

const FrozenButton = lazy(() =>
  import("./rukia/rukia-frost").then((module) => ({
    default: module.FrozenButton,
  })),
);

const GremoryButton = lazy(() =>
  import("./rias/rias-effects").then((module) => ({
    default: module.GremoryButton,
  })),
);

interface ThemeInteractiveFrameProps {
  children: ReactNode;
  isHovered: boolean;
  isActive: boolean;
  className?: string;
  subtle?: boolean;
  rounded?: string;
}

export const ThemeInteractiveFrame = ({
  children,
  isHovered,
  isActive,
  className,
  subtle,
  rounded,
}: ThemeInteractiveFrameProps) => {
  const { isRukiaTheme, isRiasTheme } = useThemeMeta();

  if (isRukiaTheme) {
    return (
      <Suspense fallback={<>{children}</>}>
        <FrozenButton
          isHovered={isHovered}
          isActive={isActive}
          className={className}
          subtle={subtle}
          rounded={rounded}
        >
          {children}
        </FrozenButton>
      </Suspense>
    );
  }
  if (isRiasTheme) {
    return (
      <Suspense fallback={<>{children}</>}>
        <GremoryButton
          isHovered={isHovered}
          isActive={isActive}
          className={className}
          subtle={subtle}
          rounded={rounded}
        >
          {children}
        </GremoryButton>
      </Suspense>
    );
  }
  return <>{children}</>;
};
