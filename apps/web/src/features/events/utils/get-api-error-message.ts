import { getApiErrorMessage as getSharedApiErrorMessage } from "@/lib/api-client/api-client";

export const getApiErrorMessage = (error: unknown): string | undefined => {
  return getSharedApiErrorMessage(error);
};
