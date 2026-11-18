import { SpinnerOverrideProvider } from "@lootlog/ui/components/spinner";
import type { ResolvedThemeId, ThemeFamily } from "@lootlog/ui/themes/catalog";
import {
  lazy,
  Suspense,
  type ComponentType,
  type FC,
  type ReactNode,
} from "react";
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
  import("./rukia/frozen-button").then((module) => ({
    default: module.FrozenButton,
  })),
);

const FrozenCircle = lazy(() =>
  import("./rukia/frozen-circle").then((module) => ({
    default: module.FrozenCircle,
  })),
);

const FrostOverlay = lazy(() =>
  import("./rukia/frost-overlay").then((module) => ({
    default: module.FrostOverlay,
  })),
);

const GremoryButton = lazy(() =>
  import("./rias/gremory-button").then((module) => ({
    default: module.GremoryButton,
  })),
);

const GremoryCircle = lazy(() =>
  import("./rias/gremory-circle").then((module) => ({
    default: module.GremoryCircle,
  })),
);

const DestructionOverlay = lazy(() =>
  import("./rias/destruction-overlay").then((module) => ({
    default: module.DestructionOverlay,
  })),
);

const RukiaFrostOverlay = lazy(() =>
  import("./rukia/global-frost-overlay").then((module) => ({
    default: module.GlobalFrostOverlay,
  })),
);

const RiasDestructionOverlay = lazy(() =>
  import("./rias/global-destruction-overlay").then((module) => ({
    default: module.GlobalDestructionOverlay,
  })),
);

type FrameProps = {
  children: ReactNode;
  isHovered: boolean;
  isActive: boolean;
  className?: string;
  subtle?: boolean;
  rounded?: string;
};

type OverlayProps = { subtle: boolean; rounded: string };

/**
 * What a theme family adds to the shell. A family without an entry keeps the
 * standard look there.
 */
type ThemeFamilyDecorations = {
  /** Suffix of the family's variant of a translation key, e.g. `titleCat`. */
  keySuffix: string;
  greetingSuffix: string;
  Spinner?: FC<{ className?: string }>;
  RootEffects?: ComponentType;
  SidebarBackground?: ComponentType;
  SidebarFooterDecoration?: ComponentType<{ theme: ResolvedThemeId }>;
  InteractiveFrame?: ComponentType<FrameProps>;
  CircularFrame?: ComponentType<{ children: ReactNode; isActive: boolean }>;
  SurfaceOverlay?: ComponentType<OverlayProps>;
  EmptyStateIcon?: ComponentType<{ className?: string }>;
};

const THEME_FAMILIES: Record<ThemeFamily, ThemeFamilyDecorations> = {
  standard: { keySuffix: "", greetingSuffix: "👋" },
  cat: {
    keySuffix: "Cat",
    greetingSuffix: "🐱",
    Spinner: LazyCatPawSpinner,
    SidebarFooterDecoration: SidebarCatAnimation,
    EmptyStateIcon: CatEmptyStateIcon,
  },
  rukia: {
    keySuffix: "Rukia",
    greetingSuffix: "❄️",
    Spinner: LazyRukiaIceSpinner,
    RootEffects: RukiaFrostOverlay,
    SidebarBackground: FrozenSidebarBackground,
    InteractiveFrame: FrozenButton,
    CircularFrame: FrozenCircle,
    SurfaceOverlay: FrostOverlay,
    EmptyStateIcon: RukiaEmptyStateIcon,
  },
  rias: {
    keySuffix: "Rias",
    greetingSuffix: "♔",
    Spinner: LazyRiasMagicSpinner,
    RootEffects: RiasDestructionOverlay,
    SidebarBackground: RiasSidebarBackground,
    SidebarFooterDecoration: SidebarMagicCircle,
    InteractiveFrame: GremoryButton,
    CircularFrame: GremoryCircle,
    SurfaceOverlay: DestructionOverlay,
    EmptyStateIcon: RiasEmptyStateIcon,
  },
};

const useThemeFamily = () => THEME_FAMILIES[useThemeMeta().family];

export const ThemeSpinnerProvider: FC<{ children: ReactNode }> = ({
  children,
}) => (
  <SpinnerOverrideProvider spinner={useThemeFamily().Spinner ?? null}>
    {children}
  </SpinnerOverrideProvider>
);

export const ThemeRootEffects = () => {
  const { RootEffects } = useThemeFamily();

  return RootEffects ? (
    <Suspense fallback={null}>
      <RootEffects />
    </Suspense>
  ) : null;
};

export const ThemeSidebarBackground = () => {
  const { SidebarBackground } = useThemeFamily();

  return SidebarBackground ? (
    <Suspense fallback={null}>
      <SidebarBackground />
    </Suspense>
  ) : null;
};

export const ThemeSidebarFooterDecoration = () => {
  const { resolvedTheme } = useThemeMeta();
  const { SidebarFooterDecoration } = useThemeFamily();

  return SidebarFooterDecoration ? (
    <Suspense fallback={null}>
      <SidebarFooterDecoration theme={resolvedTheme} />
    </Suspense>
  ) : null;
};

export const ThemeInteractiveFrame = (props: FrameProps) => {
  const { InteractiveFrame } = useThemeFamily();

  return InteractiveFrame ? (
    <Suspense fallback={<>{props.children}</>}>
      <InteractiveFrame {...props} />
    </Suspense>
  ) : (
    <>{props.children}</>
  );
};

export const ThemeCircularFrame = ({
  children,
  isActive,
}: {
  children: ReactNode;
  isActive: boolean;
}) => {
  const { CircularFrame } = useThemeFamily();

  return CircularFrame ? (
    <Suspense fallback={<>{children}</>}>
      <CircularFrame isActive={isActive}>{children}</CircularFrame>
    </Suspense>
  ) : (
    <>{children}</>
  );
};

export const ThemeSurfaceOverlay = ({
  subtle = false,
  rounded = "rounded-xl",
}: Partial<OverlayProps>) => {
  const { SurfaceOverlay } = useThemeFamily();

  return SurfaceOverlay ? (
    <Suspense fallback={null}>
      <SurfaceOverlay subtle={subtle} rounded={rounded} />
    </Suspense>
  ) : null;
};

/** The current family's variant of a translation key. */
export const useThemedKey = () => {
  const { keySuffix } = useThemeFamily();

  return (base: string) => `${base}${keySuffix}`;
};

export const useThemeGreetingSuffix = () => useThemeFamily().greetingSuffix;

export const ThemeEmptyStateIcon = ({
  className,
  fallback = null,
}: {
  className?: string;
  fallback?: ReactNode;
}) => {
  const { EmptyStateIcon } = useThemeFamily();

  return EmptyStateIcon ? (
    <Suspense fallback={<>{fallback}</>}>
      <EmptyStateIcon className={className} />
    </Suspense>
  ) : (
    <>{fallback}</>
  );
};
