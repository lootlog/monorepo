import { useTranslation } from "react-i18next";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import {
  NotificationChatPublishError,
  isNotificationRateLimitError,
} from "./use-notification-chat-orchestration";

export const useChatSendError = () => {
  const { t } = useTranslation("chat");

  return (cause: unknown) => {
    if (cause instanceof NotificationChatPublishError) {
      showRuntimeMessage(t("quickActions.partialDelivery"));
    } else {
      showRuntimeMessage(
        t(
          isNotificationRateLimitError(cause)
            ? "errors.rateLimited"
            : "errors.sendFailed",
        ),
      );
    }
  };
};
