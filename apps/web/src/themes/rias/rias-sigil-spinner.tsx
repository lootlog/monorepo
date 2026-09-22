import type { FC } from "react";
import { cn } from "cn";

/* The Gremory seal (public/themes/rias/sigil.webp) turning slowly; animation lives in rias.css. */
export const RiasSigilSpinner: FC<{ className?: string }> = ({ className }) => (
  <span
    role="status"
    aria-hidden="true"
    className={cn("rias-spinner size-14", className)}
  />
);
