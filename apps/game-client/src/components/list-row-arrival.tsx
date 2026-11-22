import type { CSSProperties, FC } from "react";

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
    // SAFETY: CSSProperties has no index signature for custom properties;
    // "--ll-row-arrival-accent" is consumed by the children's classes.
    style={
      {
        "--ll-row-arrival-accent": accent,
        opacity: strength,
      } as CSSProperties
    }
  >
    <span className="ll-row-arrival-tint ll:absolute ll:inset-0 ll:bg-[var(--ll-row-arrival-accent)]" />
    <span className="ll-row-arrival-sheen ll:absolute ll:inset-y-0 ll:left-0 ll:w-2/5 ll:bg-[linear-gradient(105deg,transparent,rgb(255_255_255/0.32),transparent)]" />
  </span>
);
