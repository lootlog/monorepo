import { lazy, Suspense } from "react";
import { useTheme } from "@/hooks/context/use-theme";

const RukiaFrostOverlay = lazy(() =>
  import("./rukia-frost-overlay").then((module) => ({
    default: module.RukiaFrostOverlay,
  })),
);

export const ThemedRukiaFrostOverlay = () => {
  const { theme } = useTheme();

  if (theme !== "rukia") {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <RukiaFrostOverlay />
    </Suspense>
  );
};
