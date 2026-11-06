"use client";

import type { CSSPropertiesWithVariables } from "../types/css";
import {
  Toaster as Sonner,
  toast as sonnerToast,
  type ExternalToast,
  type ToasterProps,
} from "sonner";

const style: CSSPropertiesWithVariables = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
};

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner theme="dark" className="toaster group" style={style} {...props} />
  );
};

/**
 * Sonner's `toast`, except that errors stay until they are dismissed: a
 * failure must not vanish before it is read, so it carries a close button
 * instead of a timer. Confirmations keep Sonner's timeout.
 */
const toast: typeof sonnerToast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  sonnerToast,
  {
    error: (
      message: Parameters<typeof sonnerToast.error>[0],
      data?: ExternalToast,
    ) =>
      sonnerToast.error(message, {
        duration: Number.POSITIVE_INFINITY,
        closeButton: true,
        ...data,
      }),
  },
);

export { Toaster, toast };
