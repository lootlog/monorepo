import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGateway } from "@/hooks/utils/use-gateway";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { GatewayEvent } from "@/config/gateway";
import type { RefreshJobUpdate } from "@/types/refresh-job";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { queryKeys } from "@/lib/query-keys";

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
  const { socket, connected } = useGateway();
  const guildId = useGuildId();

  useEffect(() => {
    if (!guildId || !connected) {
      return;
    }

    const handleRefreshJobUpdate = (data: RefreshJobUpdate) => {
      const now = new Date().toISOString();

      if (data.refreshedIds && data.refreshedIds.length > 0) {
        queryClient.setQueriesData(
          { queryKey: queryKeys.members.list(guildId) },
          (oldData: { data: GuildMember[] } | undefined) => {
            if (!oldData?.data) return oldData;

            return {
              ...oldData,
              data: oldData.data.map((member) =>
                data.refreshedIds?.includes(member.userId)
                  ? { ...member, updatedAt: now, isStale: false }
                  : member,
              ),
            };
          },
        );

        setRefreshedIds((prev) => {
          const newSet = new Set(prev);
          data.refreshedIds?.forEach((id) => newSet.add(id));
          return newSet;
        });

        setFailedIds((prev) => {
          const newSet = new Set(prev);
          data.refreshedIds?.forEach((id) => newSet.delete(id));
          return newSet;
        });
      }

      if (data.failedIds && data.failedIds.length > 0) {
        setFailedIds((prev) => {
          const newSet = new Set(prev);
          data.failedIds?.forEach((id) => newSet.add(id));
          return newSet;
        });

        setRefreshedIds((prev) => {
          const newSet = new Set(prev);
          data.failedIds?.forEach((id) => newSet.delete(id));
          return newSet;
        });
      }
    };

    socket.on(GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE, handleRefreshJobUpdate);

    return () => {
      socket.off(
        GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE,
        handleRefreshJobUpdate,
      );
    };
  }, [guildId, socket, connected, queryClient]);

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
