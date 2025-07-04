import { FC, PropsWithChildren } from "react";
import { createPortal } from "react-dom";

export const UnderBagTimers: FC<PropsWithChildren> = ({ children }) => {
  const bottomWrapper = document.querySelector(".bottom-wrapper");

  return createPortal(
    <div
      className="ll-pl-4 ll-h-full ll-pr-[2px]"
      onWheel={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    bottomWrapper!
  );
};
