import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  NotificationChatPublishError,
  isNotificationRateLimitError,
} from "./use-notification-chat-orchestration";

export const useChatSendError = () => {
  const { t } = useTranslation("chat");

  return (cause: unknown) => {
    if (cause instanceof NotificationChatPublishError) {
      toast.warning(t("quickActions.partialDelivery"));
    } else {
      toast.error(
        t(
          isNotificationRateLimitError(cause)
            ? "errors.rateLimited"
            : "errors.sendFailed",
        ),
      );
    }
  };
};
