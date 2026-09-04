import { Loader2 } from "lucide-react";
import type { FC } from "react";
import { cn } from "cn";

type SpinnerProps = {
  className?: string;
};

export const Spinner: FC<SpinnerProps> = ({ className }) => {
  return (
    <Loader2
      aria-hidden
      className={cn("ll:animate-spin ll:motion-reduce:animate-none", className)}
    />
  );
};
