import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  membersControllerGetMe,
  type UserCurrentGuildResponseDtoOutput,
} from "@lootlog/client/main";
import {
  type ApiError,
  requiresReauthentication,
} from "@lootlog/client/transport";
import { create } from "zustand";
import { queryClient } from "@/lib/query-client";
import { useWindowsStore } from "@/store/windows.store";

type ReauthenticationState = {
  readonly required: boolean;
  readonly checking: boolean;
  readonly guildId: string | null;
};

const INITIAL_STATE: ReauthenticationState = {
  required: false,
  checking: false,
  guildId: null,
};

export const useReauthenticationStore = create<ReauthenticationState>(
  () => INITIAL_STATE,
);

export const resetReauthentication = () =>
  useReauthenticationStore.setState(INITIAL_STATE);

const GUILD_PATH = /\/guilds\/([^/?#]+)/u;

export const requireReauthentication = (error: ApiError) => {
  const state = useReauthenticationStore.getState();

  const guildId =
    GUILD_PATH.exec(new URL(error.url, window.location.origin).pathname)?.[1] ??
    null;

  useReauthenticationStore.setState({
    required: true,
    guildId: guildId ?? state.guildId,
  });

  if (!state.required)
    useWindowsStore.getState().openAndFocus("extension-login");
};

const reauthenticationQueries = {
  type: "active",
  predicate: (query: { state: { error: unknown } }) =>
    requiresReauthentication(query.state.error),
} as const;

const confirmOrganizationAccess = (guildId: string | null) => {
  const probeGuildId =
    guildId ??
    queryClient.getQueryData<UserCurrentGuildResponseDtoOutput[]>(
      getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    )?.[0]?.id;

  if (!probeGuildId) return Promise.resolve(false);

  return membersControllerGetMe({ guildId: probeGuildId }).then(
    () => true,
    () => false,
  );
};

export const recheckReauthentication = async () => {
  const { required, checking, guildId } = useReauthenticationStore.getState();

  if (!required || checking) return;

  useReauthenticationStore.setState({ checking: true });

  let confirmed = false;

  try {
    [confirmed] = await Promise.all([
      confirmOrganizationAccess(guildId),
      queryClient.refetchQueries(reauthenticationQueries),
    ]);
  } finally {
    useReauthenticationStore.setState({
      checking: false,
      required:
        !confirmed ||
        queryClient.getQueryCache().findAll(reauthenticationQueries).length > 0,
    });
  }
};
