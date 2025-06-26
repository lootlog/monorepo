import { cn } from "@/lib/utils";
import { ComponentProps, FC } from "react";

export const Button: FC<ComponentProps<"button">> = ({
  className,
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        "ll-text-[12px] ll-border ll-border-gray-400 ll-bg-gray-400/30 hover:ll-bg-gray-400/50 ll-rounded-sm ll-h-5 ll-text-white disabled:ll-bg-gray-700/30 disabled:ll-text-gray-500 disabled:ll-cursor-not-allowed ll-transition-colors ll-flex ll-items-center ll-justify-center",
        className,
        "ll-custom-cursor-pointer"
      )}
      onMouseDown={(evt) => {
        evt.stopPropagation();
      }}
      {...props}
    >
      {children}
    </button>
  );
};
