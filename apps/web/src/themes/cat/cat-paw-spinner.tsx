import { useEffect, useState, type FC } from "react";

import { CatPawLottie } from "./cat-paw-lottie";

interface CatPawSpinnerProps {
  className?: string;
}

let cachedAnimationData: object | null = null;

export const CatPawSpinner: FC<CatPawSpinnerProps> = ({ className }) => {
  const [animationData, setAnimationData] = useState<object | null>(
    cachedAnimationData,
  );

  useEffect(() => {
    if (cachedAnimationData) return;

    fetch("/lottie/cat-paw-loading.json")
      .then((res) => res.json())
      .then((data) => {
        cachedAnimationData = data;
        setAnimationData(data);
      })
      .catch(() => {});
  }, []);

  if (!animationData) return null;

  return <CatPawLottie animationData={animationData} className={className} />;
};
