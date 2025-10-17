import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface RefreshStatusContextValue {
  refreshedIds: Set<string>;
  failedIds: Set<string>;
  markAsRefreshed: (ids: string[]) => void;
  markAsFailed: (ids: string[]) => void;
  clearRefreshedId: (id: string) => void;
  clearAll: () => void;
}

const RefreshStatusContext = createContext<RefreshStatusContextValue | undefined>(undefined);

export const useRefreshStatus = () => {
  const context = useContext(RefreshStatusContext);
  if (!context) {
    throw new Error('useRefreshStatus must be used within RefreshStatusProvider');
  }
  return context;
};

interface RefreshStatusProviderProps {
  children: ReactNode;
}

const REFRESH_INDICATOR_DURATION = 3000;

export const RefreshStatusProvider = ({ children }: RefreshStatusProviderProps) => {
  const [refreshedIds, setRefreshedIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  const markAsRefreshed = useCallback((ids: string[]) => {
    setRefreshedIds((prev) => {
      const newSet = new Set(prev);
      ids.forEach((id) => newSet.add(id));
      return newSet;
    });

    ids.forEach((id) => {
      setTimeout(() => {
        setRefreshedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, REFRESH_INDICATOR_DURATION);
    });
  }, []);

  const markAsFailed = useCallback((ids: string[]) => {
    setFailedIds((prev) => {
      const newSet = new Set(prev);
      ids.forEach((id) => newSet.add(id));
      return newSet;
    });

    ids.forEach((id) => {
      setTimeout(() => {
        setFailedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, REFRESH_INDICATOR_DURATION);
    });
  }, []);

  const clearRefreshedId = useCallback((id: string) => {
    setRefreshedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRefreshedIds(new Set());
    setFailedIds(new Set());
  }, []);

  return (
    <RefreshStatusContext.Provider
      value={{
        refreshedIds,
        failedIds,
        markAsRefreshed,
        markAsFailed,
        clearRefreshedId,
        clearAll,
      }}
    >
      {children}
    </RefreshStatusContext.Provider>
  );
};
