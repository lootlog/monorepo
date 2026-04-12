import { lazy, Suspense, useEffect, useState } from "react";
import type { ResolvedThemeId } from "../catalog";

const CatLottiePlayer = lazy(() =>
  import("./cat-lottie-player").then((module) => ({
    default: module.CatLottiePlayer,
  })),
);

const lottieByTheme: Partial<Record<ResolvedThemeId, string>> = {
  "cat-pink": "/lottie/rolling-cat.json",
  "cat-blue": "/lottie/rolling-cat-blue.json",
  "cat-purple": "/lottie/rolling-cat-purple.json",
};

export const SidebarCatAnimation = ({ theme }: { theme: ResolvedThemeId }) => {
  const [animationData, setAnimationData] = useState<object | null>(null);

  const lottieUrl = lottieByTheme[theme] ?? "/lottie/rolling-cat.json";

  useEffect(() => {
    fetch(lottieUrl)
      .then((res) => res.json())
      .then(setAnimationData)
      .catch(() => {});
  }, [lottieUrl]);

  if (!animationData) return null;

  return (
    <Suspense fallback={null}>
      <CatLottiePlayer animationData={animationData} />
    </Suspense>
  );
};
