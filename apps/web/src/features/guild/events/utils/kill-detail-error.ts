import { getApiErrorStatus } from "@lootlog/client/transport";

export function getKillDetailErrorKind(error: Error | null) {
  const status = getApiErrorStatus(error);

  if (status === 404) return "not-found";

  if (status === 401 || status === 403) return "access-denied";

  return "failure";
}
