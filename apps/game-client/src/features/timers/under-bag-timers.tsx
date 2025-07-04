import { FC, PropsWithChildren } from "react";
import { createPortal } from "react-dom";

export const UnderBagTimers: FC<PropsWithChildren> = ({ children }) => {
  const bottomWrapper = document.querySelector(".bottom-wrapper");

  return createPortal(
    <div
      className="ll-pl-4 ll-py-1 ll-box-border ll-h-full ll-pr-[6px] ll-bg-black/70"
      onWheel={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    bottomWrapper!
  );
};
