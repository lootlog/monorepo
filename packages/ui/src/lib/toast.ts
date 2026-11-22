import { toast as sonnerToast, type ExternalToast } from "sonner";

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
