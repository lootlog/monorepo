import type { FC } from "react";
import { TimersColorStatistics } from "./timers-color-statistics";

type ColorStat = {
  color: string;
  total: number;
  active: number;
  name: string;
  bgColor?: string;
  borderColor?: string;
};

type TimersFooterProps = {
  colorStatistics: ColorStat[];
  onAddTimer: () => void;
};

export const TimersFooter: FC<TimersFooterProps> = ({
  colorStatistics,
  onAddTimer,
}) => {
  return (
    <div className="ll:flex ll:items-center ll:border-t ll:border-gray-600 ll:pt-1 ll:pb-0.5 ll:px-1 ll:relative">
      <TimersColorStatistics colorStatistics={colorStatistics} />
      <button
        type="button"
        className="ll:text-[12px] ll:border ll:border-gray-400 ll:bg-gray-400/30 ll:hover:bg-gray-400/50 ll:rounded-sm ll:h-5 ll:text-white ll:px-4 ll-custom-cursor-pointer ll:mx-auto"
        onClick={onAddTimer}
      >
        +
      </button>
    </div>
  );
};
