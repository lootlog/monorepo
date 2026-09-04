import { Lottie } from "lottie-react";

export const CatLottiePlayer = ({
  animationData,
}: {
  animationData: object;
}) => {
  return (
    <div className="mt-auto absolute -bottom-16 px-2 pb-2 pointer-events-none">
      <Lottie src={animationData} loop autoplay segment={[0, 380]} />
    </div>
  );
};
