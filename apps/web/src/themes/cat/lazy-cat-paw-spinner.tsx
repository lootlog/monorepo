import { lazy, Suspense } from "react";
import { cn } from "@/utils/cn";

const CatPawSpinner = lazy(() =>
  import("./cat-paw-spinner").then((module) => ({
    default: module.CatPawSpinner,
  })),
);

export const LazyCatPawSpinner = ({ className }: { className?: string }) => {
  return (
    <Suspense
      fallback=<div
        className={cn(
          "size-14 animate-spin rounded-full border-2 border-current border-t-transparent",
          className,
        )}
      />
    >
      <CatPawSpinner className={className} />
    </Suspense>
  );
};
