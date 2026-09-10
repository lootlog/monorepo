import type { FC } from "react";
import { useLottieAnimation } from "./use-lottie-animation";

import { CatPawLottie } from "./cat-paw-lottie";

interface CatPawSpinnerProps {
  className?: string;
}

export const CatPawSpinner: FC<CatPawSpinnerProps> = ({ className }) => {
  const { data: animationData } = useLottieAnimation(
    "/lottie/cat-paw-loading.json",
  );

  if (!animationData) return null;

  return <CatPawLottie animationData={animationData} className={className} />;
};
