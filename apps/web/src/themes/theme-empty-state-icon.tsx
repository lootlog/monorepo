import { lazy, Suspense, type ReactNode } from "react";
import { useThemeMeta } from "./use-theme-meta";

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
