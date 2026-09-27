import type { ReactNode } from "react";

/** A block of the timer tooltip, divided from the one above it. */
export function TimerTooltipSection({
  heading,
  children,
}: {
  heading?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ll:flex ll:flex-col ll:gap-1 ll:border-t ll:border-solid ll:border-white/15 ll:pt-1.5">
      {heading && (
        <h3 className="ll:m-0 ll:flex ll:items-center ll:gap-1.5 ll:text-xs ll:leading-4 ll:font-semibold">
          {heading}
        </h3>
      )}
      {children}
    </section>
  );
}
