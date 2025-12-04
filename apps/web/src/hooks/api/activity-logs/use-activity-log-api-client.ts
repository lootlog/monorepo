import { activityApiClient } from "@/lib/api-client/api-client";

export const useActivityApiClient = () => {
  return { client: activityApiClient };
};
