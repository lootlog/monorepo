import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { Lottie } from "lottie-react";

export const CatLottiePlayer = ({
  animationData,
}: {
  animationData: object;
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="mt-auto absolute -bottom-16 px-2 pb-2 pointer-events-none">
      <Lottie
        key={String(prefersReducedMotion)}
        src={animationData}
        loop={!prefersReducedMotion}
        autoplay={!prefersReducedMotion}
        segment={[0, 380]}
      />
    </div>
  );
};
