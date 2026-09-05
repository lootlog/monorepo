import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRefreshJobUpdates } from "@/hooks/utils/use-refresh-job-updates";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getMembersControllerGetGuildMembersQueryKey,
  useGuildsControllerGetGuildById,
} from "@lootlog/client/main";

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

interface RefreshStatusProviderProps {
  children: ReactNode;
}

export const RefreshStatusProvider = ({
  children,
}: RefreshStatusProviderProps) => {
  const [refreshedIds, setRefreshedIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const routeGuildId = useGuildId();
  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: routeGuildId ?? "",
  });

  const markAsRefreshed = useCallback((ids: string[]) => {
    setRefreshedIds((prev) => {
      const newSet = new Set(prev);
      ids.forEach((id) => newSet.add(id));
      return newSet;
    });
    setFailedIds((prev) => {
      const newSet = new Set(prev);
      ids.forEach((id) => newSet.delete(id));
      return newSet;
    });
  }, []);

  const markAsFailed = useCallback((ids: string[]) => {
    setFailedIds((prev) => {
      const newSet = new Set(prev);
      ids.forEach((id) => newSet.add(id));
      return newSet;
    });
    setRefreshedIds((prev) => {
      const newSet = new Set(prev);
      ids.forEach((id) => newSet.delete(id));
      return newSet;
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

  useRefreshJobUpdates(guild?.id, (data) => {
    if (
      data.refreshedIds?.length ||
      data.skippedIds?.length ||
      data.failedIds?.length
    ) {
      // Skipped and failed attempts can update Discord sync diagnostics.
      void queryClient.invalidateQueries({
        queryKey: getMembersControllerGetGuildMembersQueryKey({
          guildId: routeGuildId ?? data.guildId,
        }),
      });
    }
    if (data.refreshedIds?.length) markAsRefreshed(data.refreshedIds);
    if (data.failedIds?.length) markAsFailed(data.failedIds);
  });

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
