import type { FC } from "react";

type Props = {
  count: number;
};

export const ItemStackBadge: FC<Props> = ({ count }) => (
  <span
    className="absolute -bottom-1.5 -right-1.5 z-20 min-w-[20px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none flex items-center justify-center shadow-sm pointer-events-none"
    aria-label={`+${count}`}
  >
    +{count}
  </span>
);
