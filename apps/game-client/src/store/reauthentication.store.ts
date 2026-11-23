import { requiresReauthentication } from "@lootlog/client/transport";
import { create } from "zustand";
import { queryClient } from "@/lib/query-client";
import { useWindowsStore } from "@/store/windows.store";

type ReauthenticationState = {
  readonly required: boolean;
  readonly checking: boolean;
};

export const useReauthenticationStore = create<ReauthenticationState>(() => ({
  required: false,
  checking: false,
}));

export const requireReauthentication = () => {
  if (useReauthenticationStore.getState().required) return;

  useReauthenticationStore.setState({ required: true });
  useWindowsStore.getState().openAndFocus("extension-login");
};

const reauthenticationQueries = {
  type: "active",
  predicate: (query: { state: { error: unknown } }) =>
    requiresReauthentication(query.state.error),
} as const;

export const recheckReauthentication = async () => {
  const { required, checking } = useReauthenticationStore.getState();

  if (!required || checking) return;

  useReauthenticationStore.setState({ checking: true });

  try {
    await queryClient.refetchQueries(reauthenticationQueries);
  } finally {
    useReauthenticationStore.setState({
      checking: false,
      required:
        queryClient.getQueryCache().findAll(reauthenticationQueries).length > 0,
    });
  }
};
