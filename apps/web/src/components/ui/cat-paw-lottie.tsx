import type { FC } from "react";
import { useLottie } from "lottie-react";

interface CatPawLottieProps {
  animationData: object;
  className?: string;
}

export const CatPawLottie: FC<CatPawLottieProps> = ({ animationData }) => {
  const { View } = useLottie({
    animationData,
    loop: true,
    autoplay: true,
  });

  return <div className="cat-paw-spinner size-14">{View}</div>;
};
