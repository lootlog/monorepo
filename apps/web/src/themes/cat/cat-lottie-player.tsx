import { useLottie } from "lottie-react";

export const CatLottiePlayer = ({
  animationData,
}: {
  animationData: object;
}) => {
  const { View } = useLottie({
    animationData,
    loop: true,
    autoplay: true,
    initialSegment: [0, 380],
  });

  return (
    <div className="mt-auto absolute -bottom-16 px-2 pb-2 pointer-events-none">
      {View}
    </div>
  );
};
