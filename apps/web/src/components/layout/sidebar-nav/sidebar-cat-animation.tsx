import { useEffect, useState } from "react";
import { CatLottiePlayer } from "./cat-lottie-player";

const lottieByTheme: Record<string, string> = {
  "cat-pink": "/lottie/rolling-cat.json",
  "cat-blue": "/lottie/rolling-cat-blue.json",
  "cat-purple": "/lottie/rolling-cat-purple.json",
};

export const SidebarCatAnimation = ({ theme }: { theme: string }) => {
  const [animationData, setAnimationData] = useState<object | null>(null);

  const lottieUrl = lottieByTheme[theme] ?? "/lottie/rolling-cat.json";

  useEffect(() => {
    fetch(lottieUrl)
      .then((res) => res.json())
      .then(setAnimationData)
      .catch(() => {});
  }, [lottieUrl]);

  if (!animationData) return null;

  return <CatLottiePlayer animationData={animationData} />;
};
