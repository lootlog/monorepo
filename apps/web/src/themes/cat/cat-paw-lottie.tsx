import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useState, type FC } from "react";
import { Lottie } from "lottie-react";
import { cn } from "cn";
import { CatEmptyStateIcon } from "./cat-empty-state-icon";

interface CatPawLottieProps {
  animationData: object;
  className?: string;
}

export const CatPawLottie: FC<CatPawLottieProps> = ({
  animationData,
  className,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [completed, setCompleted] = useState(false);

  return (
    <div className={cn("cat-paw-spinner size-14", className)}>
      {prefersReducedMotion || completed ? (
        <CatEmptyStateIcon className="size-full" />
      ) : (
        <Lottie
          src={animationData}
          // Three plays of the 46-frame, 30-fps asset stay below five seconds.
          loop={2}
          autoplay
          subscriptions={{ complete: () => setCompleted(true) }}
        />
      )}
    </div>
  );
};
