import type { FC } from "react";

type ListRowArrivalProps = {
  accent: string;
  strength: number;
};

export const ListRowArrival: FC<ListRowArrivalProps> = ({
  accent,
  strength,
}) => (
  <span
    aria-hidden="true"
    data-ll-row-arrival=""
    className="ll:pointer-events-none ll:absolute ll:inset-0 ll:overflow-hidden"
    style={{
      "--ll-row-arrival-accent": accent,
      opacity: strength,
    }}
  >
    <span className="ll-row-arrival-tint ll:absolute ll:inset-0 ll:bg-[var(--ll-row-arrival-accent)]" />
    <span className="ll-row-arrival-sheen ll:absolute ll:inset-y-0 ll:left-0 ll:w-2/5 ll:bg-[linear-gradient(105deg,transparent,rgb(255_255_255/0.32),transparent)]" />
  </span>
);
