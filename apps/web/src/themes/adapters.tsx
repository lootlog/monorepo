import { SpinnerOverrideProvider } from "@lootlog/ui/components/spinner";
import { lazy, Suspense, type FC, type ReactNode } from "react";
import { LazyCatPawSpinner } from "./cat/lazy-cat-paw-spinner";
import { RukiaSigilSpinner } from "./rukia/rukia-sigil-spinner";
import { RiasSigilSpinner } from "./rias/rias-sigil-spinner";
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

const getSpinnerOverride = (
  isCatTheme: boolean,
  isRukiaTheme: boolean,
  isRiasTheme: boolean,
) => {
  if (isCatTheme) return LazyCatPawSpinner;

  if (isRukiaTheme) return RukiaSigilSpinner;

  if (isRiasTheme) return RiasSigilSpinner;

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

/* Rias and Rukia decorate the sidebar from CSS (rias.css / rukia.css); only the cat needs React. */
export const ThemeSidebarFooterDecoration = () => {
  const { isCatTheme, resolvedTheme } = useThemeMeta();

  if (isCatTheme) {
    return (
      <Suspense fallback={null}>
        <SidebarCatAnimation theme={resolvedTheme} />
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
  const { isCatTheme, isRukiaTheme } = useThemeMeta();

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

  return <>{fallback}</>;
};
