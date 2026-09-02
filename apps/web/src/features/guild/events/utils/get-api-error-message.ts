import { getApiErrorMessage as getSharedApiErrorMessage } from "@lootlog/client/transport";

export const getApiErrorMessage = (error: unknown): string | undefined => {
  return getSharedApiErrorMessage(error);
};
