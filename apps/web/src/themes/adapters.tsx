import { SpinnerOverrideProvider } from "@lootlog/ui/components/spinner";
import { lazy, Suspense, type FC, type ReactNode } from "react";
import { LazyCatPawSpinner } from "./cat/lazy-cat-paw-spinner";
import { SidebarCatAnimation } from "./cat/sidebar-cat-animation";
import { CatEmptyStateIcon } from "./cat/cat-empty-state-icon";
import { LazyRukiaIceSpinner } from "./rukia/lazy-rukia-ice-spinner";
import { RukiaEmptyStateIcon } from "./rukia/rukia-empty-state-icon";
import { useThemeMeta } from "./use-theme-meta";
import { FrozenSidebarBackground } from "./rukia/frozen-sidebar-background";
import { FrozenButton, FrozenCircle, FrostOverlay } from "./rukia/rukia-frost";

const RukiaFrostOverlay = lazy(() =>
  import("./rukia/rukia-frost-overlay").then((module) => ({
    default: module.RukiaFrostOverlay,
  })),
);

const getSpinnerOverride = (isCatTheme: boolean, isRukiaTheme: boolean) => {
  if (isCatTheme) return LazyCatPawSpinner;
  if (isRukiaTheme) return LazyRukiaIceSpinner;
  return null;
};

export const ThemeSpinnerProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { isCatTheme, isRukiaTheme } = useThemeMeta();

  return (
    <SpinnerOverrideProvider
      spinner={getSpinnerOverride(isCatTheme, isRukiaTheme)}
    >
      {children}
    </SpinnerOverrideProvider>
  );
};

export const ThemeRootEffects = () => {
  const { isRukiaTheme } = useThemeMeta();

  if (!isRukiaTheme) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <RukiaFrostOverlay />
    </Suspense>
  );
};

export const ThemeSidebarBackground = () => {
  const { isRukiaTheme } = useThemeMeta();

  return isRukiaTheme ? <FrozenSidebarBackground /> : null;
};

export const ThemeSidebarFooterDecoration = () => {
  const { isCatTheme, resolvedTheme } = useThemeMeta();

  return isCatTheme ? <SidebarCatAnimation theme={resolvedTheme} /> : null;
};

type ThemeInteractiveFrameProps = {
  children: ReactNode;
  isHovered: boolean;
  isActive: boolean;
  className?: string;
  subtle?: boolean;
  rounded?: string;
};

export const ThemeInteractiveFrame = ({
  children,
  isHovered,
  isActive,
  className,
  subtle,
  rounded,
}: ThemeInteractiveFrameProps) => {
  const { isRukiaTheme } = useThemeMeta();

  if (!isRukiaTheme) {
    return <>{children}</>;
  }

  return (
    <FrozenButton
      isHovered={isHovered}
      isActive={isActive}
      className={className}
      subtle={subtle}
      rounded={rounded}
    >
      {children}
    </FrozenButton>
  );
};

export const ThemeCircularFrame = ({
  children,
  isActive,
}: {
  children: ReactNode;
  isActive: boolean;
}) => {
  const { isRukiaTheme } = useThemeMeta();

  if (!isRukiaTheme) {
    return <>{children}</>;
  }

  return <FrozenCircle isActive={isActive}>{children}</FrozenCircle>;
};

export const ThemeSurfaceOverlay = ({
  subtle = false,
  rounded = "rounded-xl",
}: {
  subtle?: boolean;
  rounded?: string;
}) => {
  const { isRukiaTheme } = useThemeMeta();

  return isRukiaTheme ? (
    <FrostOverlay subtle={subtle} rounded={rounded} />
  ) : null;
};

export const useThemedKey = () => {
  const { isCatTheme, isRukiaTheme } = useThemeMeta();

  return (base: string) => {
    if (isCatTheme) return `${base}Cat`;
    if (isRukiaTheme) return `${base}Rukia`;
    return base;
  };
};

export const ThemeEmptyStateIcon = ({
  className,
  fallback = null,
}: {
  className?: string;
  fallback?: ReactNode;
}) => {
  const { isCatTheme, isRukiaTheme } = useThemeMeta();

  if (isCatTheme) return <CatEmptyStateIcon className={className} />;
  if (isRukiaTheme) return <RukiaEmptyStateIcon className={className} />;
  return <>{fallback}</>;
};
