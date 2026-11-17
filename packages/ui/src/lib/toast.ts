import { toast as sonnerToast, type ExternalToast } from "sonner";

/**
 * Sonner's `toast`, except that errors stay until they are dismissed: a
 * failure must not vanish before it is read, so it carries a close button
 * instead of a timer. Confirmations keep Sonner's timeout.
 */
export const toast: typeof sonnerToast = Object.assign(
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
