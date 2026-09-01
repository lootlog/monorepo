import { SpinnerOverrideProvider } from "@lootlog/ui/components/spinner";
import { lazy, Suspense, type FC, type ReactNode } from "react";
import { LazyCatPawSpinner } from "./cat/lazy-cat-paw-spinner";
import { LazyRukiaIceSpinner } from "./rukia/lazy-rukia-ice-spinner";
import { LazyRiasMagicSpinner } from "./rias/lazy-rias-magic-spinner";
import { useThemeMeta } from "./use-theme-meta";

const SidebarCatAnimation = lazy(() =>
  import("./cat/sidebar-cat-animation").then((module) => ({
    default: module.SidebarCatAnimation,
  })),
);

const CatEmptyStateIcon = lazy(() =>
  import("./cat/cat-empty-state-icon").then((module) => ({
    default: module.CatEmptyStateIcon,
  })),
);

const RukiaEmptyStateIcon = lazy(() =>
  import("./rukia/rukia-empty-state-icon").then((module) => ({
    default: module.RukiaEmptyStateIcon,
  })),
);

const RiasEmptyStateIcon = lazy(() =>
  import("./rias/rias-empty-state-icon").then((module) => ({
    default: module.RiasEmptyStateIcon,
  })),
);

const FrozenSidebarBackground = lazy(() =>
  import("./rukia/frozen-sidebar-background").then((module) => ({
    default: module.FrozenSidebarBackground,
  })),
);

const RiasSidebarBackground = lazy(() =>
  import("./rias/rias-sidebar-background").then((module) => ({
    default: module.RiasSidebarBackground,
  })),
);

const SidebarMagicCircle = lazy(() =>
  import("./rias/sidebar-magic-circle").then((module) => ({
    default: module.SidebarMagicCircle,
  })),
);

const FrozenButton = lazy(() =>
  import("./rukia/rukia-frost").then((module) => ({
    default: module.FrozenButton,
  })),
);

const FrozenCircle = lazy(() =>
  import("./rukia/rukia-frost").then((module) => ({
    default: module.FrozenCircle,
  })),
);

const FrostOverlay = lazy(() =>
  import("./rukia/rukia-frost").then((module) => ({
    default: module.FrostOverlay,
  })),
);

const GremoryButton = lazy(() =>
  import("./rias/rias-effects").then((module) => ({
    default: module.GremoryButton,
  })),
);

const GremoryCircle = lazy(() =>
  import("./rias/rias-effects").then((module) => ({
    default: module.GremoryCircle,
  })),
);

const DestructionOverlay = lazy(() =>
  import("./rias/rias-effects").then((module) => ({
    default: module.DestructionOverlay,
  })),
);

const RukiaFrostOverlay = lazy(() =>
  import("./rukia/rukia-frost").then((module) => ({
    default: module.GlobalFrostOverlay,
  })),
);

const RiasDestructionOverlay = lazy(() =>
  import("./rias/rias-effects").then((module) => ({
    default: module.GlobalDestructionOverlay,
  })),
);

const getSpinnerOverride = (
  isCatTheme: boolean,
  isRukiaTheme: boolean,
  isRiasTheme: boolean,
) => {
  if (isCatTheme) return LazyCatPawSpinner;
  if (isRukiaTheme) return LazyRukiaIceSpinner;
  if (isRiasTheme) return LazyRiasMagicSpinner;
  return null;
};

export const ThemeSpinnerProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { isCatTheme, isRukiaTheme, isRiasTheme } = useThemeMeta();

  return (
    <SpinnerOverrideProvider
      spinner={getSpinnerOverride(isCatTheme, isRukiaTheme, isRiasTheme)}
    >
      {children}
    </SpinnerOverrideProvider>
  );
};

export const ThemeRootEffects = () => {
  const { isRukiaTheme, isRiasTheme } = useThemeMeta();

  if (isRukiaTheme) {
    return (
      <Suspense fallback={null}>
        <RukiaFrostOverlay />
      </Suspense>
    );
  }

  if (isRiasTheme) {
    return (
      <Suspense fallback={null}>
        <RiasDestructionOverlay />
      </Suspense>
    );
  }

  return null;
};

export const ThemeSidebarBackground = () => {
  const { isRukiaTheme, isRiasTheme } = useThemeMeta();

  if (isRukiaTheme) {
    return (
      <Suspense fallback={null}>
        <FrozenSidebarBackground />
      </Suspense>
    );
  }
  if (isRiasTheme) {
    return (
      <Suspense fallback={null}>
        <RiasSidebarBackground />
      </Suspense>
    );
  }
  return null;
};

export const ThemeSidebarFooterDecoration = () => {
  const { isCatTheme, isRiasTheme, resolvedTheme } = useThemeMeta();

  if (isCatTheme) {
    return (
      <Suspense fallback={null}>
        <SidebarCatAnimation theme={resolvedTheme} />
      </Suspense>
    );
  }
  if (isRiasTheme) {
    return (
      <Suspense fallback={null}>
        <SidebarMagicCircle />
      </Suspense>
    );
  }
  return null;
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

export const ThemeSurfaceOverlay = ({
  subtle = false,
  rounded = "rounded-xl",
}: {
  subtle?: boolean;
  rounded?: string;
}) => {
  const { isRukiaTheme, isRiasTheme } = useThemeMeta();

  if (isRukiaTheme) {
    return (
      <Suspense fallback={null}>
        <FrostOverlay subtle={subtle} rounded={rounded} />
      </Suspense>
    );
  }

  if (isRiasTheme) {
    return (
      <Suspense fallback={null}>
        <DestructionOverlay subtle={subtle} rounded={rounded} />
      </Suspense>
    );
  }

  return null;
};

export const useThemedKey = () => {
  const { isCatTheme, isRukiaTheme, isRiasTheme } = useThemeMeta();

  return (base: string) => {
    if (isCatTheme) return `${base}Cat`;
    if (isRukiaTheme) return `${base}Rukia`;
    if (isRiasTheme) return `${base}Rias`;
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
  const { isCatTheme, isRukiaTheme, isRiasTheme } = useThemeMeta();

  if (isCatTheme) {
    return (
      <Suspense fallback={<>{fallback}</>}>
        <CatEmptyStateIcon className={className} />
      </Suspense>
    );
  }
  if (isRukiaTheme) {
    return (
      <Suspense fallback={<>{fallback}</>}>
        <RukiaEmptyStateIcon className={className} />
      </Suspense>
    );
  }
  if (isRiasTheme) {
    return (
      <Suspense fallback={<>{fallback}</>}>
        <RiasEmptyStateIcon className={className} />
      </Suspense>
    );
  }
  return <>{fallback}</>;
};
