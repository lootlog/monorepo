import { SpinnerOverrideProvider } from "@lootlog/ui/components/spinner";
import { lazy, Suspense, type FC, type ReactNode } from "react";
import { LazyCatPawSpinner } from "./cat/lazy-cat-paw-spinner";
import { SidebarCatAnimation } from "./cat/sidebar-cat-animation";
import { CatEmptyStateIcon } from "./cat/cat-empty-state-icon";
import { LazyRukiaIceSpinner } from "./rukia/lazy-rukia-ice-spinner";
import { RukiaEmptyStateIcon } from "./rukia/rukia-empty-state-icon";
import { LazyRiasMagicSpinner } from "./rias/lazy-rias-magic-spinner";
import { RiasEmptyStateIcon } from "./rias/rias-empty-state-icon";
import { RiasSidebarBackground } from "./rias/rias-sidebar-background";
import { RiasBatSeparator } from "./rias/rias-bat-separator";
import { SidebarMagicCircle } from "./rias/sidebar-magic-circle";
import {
  GremoryButton,
  GremoryCircle,
  DestructionOverlay,
} from "./rias/rias-effects";
import { useThemeMeta } from "./use-theme-meta";
import { FrozenSidebarBackground } from "./rukia/frozen-sidebar-background";
import { FrozenButton, FrozenCircle, FrostOverlay } from "./rukia/rukia-frost";

const RukiaFrostOverlay = lazy(() =>
  import("./rukia/rukia-frost-overlay").then((module) => ({
    default: module.RukiaFrostOverlay,
  })),
);

const RiasDestructionOverlay = lazy(() =>
  import("./rias/rias-destruction-overlay").then((module) => ({
    default: module.RiasDestructionOverlay,
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

  if (isRukiaTheme) return <FrozenSidebarBackground />;
  if (isRiasTheme) return <RiasSidebarBackground />;
  return null;
};

export const ThemeSidebarFooterDecoration = () => {
  const { isCatTheme, isRiasTheme, resolvedTheme } = useThemeMeta();

  if (isCatTheme) return <SidebarCatAnimation theme={resolvedTheme} />;
  if (isRiasTheme) return <SidebarMagicCircle />;
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
  }

  if (isRiasTheme) {
    return (
      <GremoryButton
        isHovered={isHovered}
        isActive={isActive}
        className={className}
        subtle={subtle}
        rounded={rounded}
      >
        {children}
      </GremoryButton>
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
    return <FrozenCircle isActive={isActive}>{children}</FrozenCircle>;
  }

  if (isRiasTheme) {
    return <GremoryCircle isActive={isActive}>{children}</GremoryCircle>;
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
    return <FrostOverlay subtle={subtle} rounded={rounded} />;
  }

  if (isRiasTheme) {
    return <DestructionOverlay subtle={subtle} rounded={rounded} />;
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

  if (isCatTheme) return <CatEmptyStateIcon className={className} />;
  if (isRukiaTheme) return <RukiaEmptyStateIcon className={className} />;
  if (isRiasTheme) return <RiasEmptyStateIcon className={className} />;
  return <>{fallback}</>;
};

export const ThemeSeparator = ({ className }: { className?: string }) => {
  const { isRiasTheme } = useThemeMeta();

  return isRiasTheme ? <RiasBatSeparator className={className} /> : null;
};
