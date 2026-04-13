import { cn } from "@lootlog/ui/lib/utils";
import type { ComponentProps, FC } from "react";

export const Button: FC<ComponentProps<"button">> = ({
  className,
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        "ll:text-[12px] ll:border ll:border-gray-400 ll:bg-gray-400/30 ll:hover:bg-gray-400/50 ll:rounded-sm ll:h-5 ll:text-white ll:disabled:bg-gray-700/30 ll:disabled:text-gray-500 ll:disabled:cursor-not-allowed ll:transition-colors ll:flex ll:items-center ll:justify-center",
        className,
        "ll-custom-cursor-pointer",
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
