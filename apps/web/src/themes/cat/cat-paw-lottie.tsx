import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { FC } from "react";
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

  return (
    <div className={cn("cat-paw-spinner size-14", className)}>
      {prefersReducedMotion ? (
        <CatEmptyStateIcon className="size-full" />
      ) : (
        <Lottie src={animationData} loop autoplay />
      )}
    </div>
  );
};
