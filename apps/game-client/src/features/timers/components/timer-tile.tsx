import { FC } from "react";

export type TimerTileProps = {
  children?: React.ReactNode;
  id?: string;
};

export const TimerTile: FC<TimerTileProps> = ({ children, id }) => {
  return (
    <div
      id={id}
      className="ll-custom-cursor-pointer ll-w-full ll-flex ll-items-center ll-justify-center ll-border-solid ll-border-gray-400 ll-box-border ll-border ll-rounded-sm ll-py-0.5 ll-bg-gray-500/30 hover:ll-bg-gray-400/30 ll-transition-all"
    >
      {children}
    </div>
  );
};
