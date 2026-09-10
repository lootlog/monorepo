import { createContext, useContext } from "react";

interface RefreshStatusContextValue {
  refreshedIds: Set<string>;
  failedIds: Set<string>;
  markAsRefreshed: (ids: string[]) => void;
  markAsFailed: (ids: string[]) => void;
  clearRefreshedId: (id: string) => void;
  clearAll: () => void;
}

export const RefreshStatusContext = createContext<
  RefreshStatusContextValue | undefined
>(undefined);

export const useRefreshStatus = () => {
  const context = useContext(RefreshStatusContext);
  if (!context) {
    throw new Error(
      "useRefreshStatus must be used within RefreshStatusProvider",
    );
  }
  return context;
};
