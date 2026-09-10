import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  NotificationChatPublishError,
  isNotificationRateLimitError,
} from "./use-notification-chat-orchestration";

export const useChatSendError = () => {
  const { t } = useTranslation("chat");
  // Promise rejections may contain any value; classify them at this error boundary.
  // oxlint-disable-next-line anti-slop/no-unknown-parameters
  return (error: unknown) => {
    if (error instanceof NotificationChatPublishError) {
      toast.warning(t("quickActions.partialDelivery"));
    } else {
      toast.error(
        t(
          isNotificationRateLimitError(error)
            ? "errors.rateLimited"
            : "errors.sendFailed",
        ),
      );
    }
  };
};
