import { notificationsApiClient } from "@/lib/api-client/api-client";

export const useNotificationsClient = () => {
  return { client: notificationsApiClient };
};
