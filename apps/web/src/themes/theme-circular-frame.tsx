import { lazy, Suspense, type ReactNode } from "react";
import { useThemeMeta } from "./use-theme-meta";

const FrozenCircle = lazy(() =>
  import("./rukia/rukia-frost").then((module) => ({
    default: module.FrozenCircle,
  })),
);

const GremoryCircle = lazy(() =>
  import("./rias/rias-effects").then((module) => ({
    default: module.GremoryCircle,
  })),
);

export const ThemeCircularFrame = ({
  children,
  isActive,
}: {
  children: ReactNode;
  isActive: boolean;
}) => {
  const { isRukiaTheme, isRiasTheme } = useThemeMeta();

  if (isRukiaTheme) {
    return (
      <Suspense fallback={<>{children}</>}>
        <FrozenCircle isActive={isActive}>{children}</FrozenCircle>
      </Suspense>
    );
  }
  if (isRiasTheme) {
    return (
      <Suspense fallback={<>{children}</>}>
        <GremoryCircle isActive={isActive}>{children}</GremoryCircle>
      </Suspense>
    );
  }
  return <>{children}</>;
};
