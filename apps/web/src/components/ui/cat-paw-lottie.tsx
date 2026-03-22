import type { FC } from "react";
import { useLottie } from "lottie-react";

import { cn } from "@lootlog/ui/lib/utils";

interface CatPawLottieProps {
  animationData: object;
  className?: string;
}

export const CatPawLottie: FC<CatPawLottieProps> = ({
  animationData,
  className,
}) => {
  const { View } = useLottie({
    animationData,
    loop: true,
    autoplay: true,
  });

  return <div className="cat-paw-spinner size-14">{View}</div>;
};
