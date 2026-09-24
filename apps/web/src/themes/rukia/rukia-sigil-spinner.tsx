import type { FC } from "react";
import { cn } from "cn";

/* The ice crystal seal (public/themes/rukia/sigil.webp) turning slowly; animation lives in rukia.css. */
export const RukiaSigilSpinner: FC<{ className?: string }> = ({
  className,
}) => (
  <span
    role="status"
    aria-hidden="true"
    className={cn("rukia-spinner size-14", className)}
  />
);
