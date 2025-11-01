import type { FC, PropsWithChildren } from "react";
import { createPortal } from "react-dom";

export const UnderBagTimers: FC<PropsWithChildren> = ({ children }) => {
  const bottomWrapper = document.querySelector(
    ".right-column > .inner-wrapper > .right-main-column-wrapper > .bottom-wrapper",
  );

  return (
    bottomWrapper &&
    createPortal(
      <div
        className="ll:pl-4 ll:py-1 ll:box-border ll:h-full ll:pr-1.5 ll:max-h-full ll:bg-black/70 ll:relative ll:flex ll:flex-col"
        onWheel={(e) => e.stopPropagation()}
      >
        {children}
      </div>,
      bottomWrapper!,
    )
  );
};
