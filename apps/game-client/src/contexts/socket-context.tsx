import { RealtimeRequestError } from "@lootlog/client/realtime";
import type { AccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import type { QueryClient } from "@tanstack/react-query";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import { getFixedT } from "@/i18n/get-fixed-t";
import { createGameAccessCache } from "@/lib/game-access-cache";
import { queryClient } from "@/lib/query-client";
import {
  type AppSocket,
  getSocket,
  getGameSessionIdentity,
  type AccessUpdate,
  type JoinResult,
} from "@/lib/socket";
import {
  resolveRealtimeConnectionStatus,
  type RealtimeConnectionStatus,
} from "@/lib/realtime-connection-status";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import {
  createContext,
  useContext,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * A feature cache that follows the Organization access policy. The
 * composition root supplies these, so the provider does not import features.
 */
export interface RealtimeAccessPolicyObserver {
  /** Holds the observer's policy state while the provider is mounted. */
  retain?: (queryClient: QueryClient) => () => void;
  /**
   * The session joined after an interruption or before any access policy
   * arrived, so cached history may have gaps.
   */
  resync?: (queryClient: QueryClient, guildIds: readonly string[]) => void;
  /** The access policy changed. */
  update?: (queryClient: QueryClient, policy: AccessPolicySnapshot) => void;
}

type SocketContextValue = {
  socket: AppSocket | null;
  connected: boolean;
  joined: boolean;
  joinedGuilds: string[];
  status: RealtimeConnectionStatus;
};

const EMPTY_JOINED_GUILDS: string[] = [];

// A join that fails on an open socket, such as an invalid response, is not
// followed by a reconnect, so the provider retries it itself.
const JOIN_RETRY_BASE_DELAY_MS = 1_000;

const JOIN_RETRY_MAX_DELAY_MS = 30_000;

// The gateway's static refusal messages (apps/gateway realtime-errors.ts).
const getJoinRejectionReasonKey = (reason: string) => {
  switch (reason) {
    case "organization access denied":
      return "organizationAccessDenied";
    case "game sessions require a character":
      return "characterRequired";
    case "subscription limit exceeded":
      return "subscriptionLimit";
    default:
      return null;
  }
};

/**
 * A gateway refusal the player can act on, in their language. Retryable
 * refusals recover on their own, and a user without an Organization is shown
 * that state where it matters instead of as a connection failure.
 */
const describeJoinRejection = (error: Error): string | null => {
  if (!(error instanceof RealtimeRequestError) || error.retryable) return null;
  const reason = error.message.trim().toLowerCase();

  if (reason === "no authorized organizations") return null;
  const t = getFixedT("common");
  const key = getJoinRejectionReasonKey(reason);

  return key
    ? t(`realtimeJoin.reasons.${key}`)
    : t("realtimeJoin.reasons.unknown", { reason: error.message });
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  joined: false,
  joinedGuilds: [],
  status: "connecting",
});

const subscribeConnection = (listener: () => void) => {
  const socket = getSocket();
  socket.on("connect", listener);
  socket.on("disconnect", listener);

  return () => {
    socket.off("connect", listener);
    socket.off("disconnect", listener);
  };
};

const isConnected = () => getSocket().connected;

const subscribeConnectionState = (listener: () => void) =>
  getSocket().subscribeConnectionState(listener);

const getConnectionState = () => getSocket().connectionState;

export const SocketProvider = ({
  accessPolicyObservers,
  children,
}: {
  accessPolicyObservers: readonly RealtimeAccessPolicyObserver[];
  children?: ReactNode;
}) => {
  const socket = getSocket();
  const connected = useSyncExternalStore(subscribeConnection, isConnected);

  const connectionState = useSyncExternalStore(
    subscribeConnectionState,
    getConnectionState,
  );

  const hasBeenUnavailable = useRef(false);

  useEffect(() => {
    if (connectionState === "reconnecting") hasBeenUnavailable.current = true;
  }, [connectionState]);

  const [joinedCharacterIdentity, setJoinedCharacterIdentity] = useState<
    string | null
  >(null);

  const [hasBeenOnline, setHasBeenOnline] = useState(false);
  const [joinFailed, setJoinFailed] = useState(false);
  const [joinRetry, setJoinRetry] = useState(0);
  const joinAttempt = useRef(0);
  const joinFailures = useRef(0);
  // One message per run of refusals, so retries do not repeat it.
  const joinRejectionShown = useRef(false);
  const [guildIds, setJoinedGuilds] = useState<string[]>([]);

  // Deferred like the overlay in AppContent: both values share React's
  // deferred lane, so the join is sent in the commit that mounts the feature
  // trees and their listeners, not ahead of them.
  const gameInitialized = useDeferredValue(
    useGlobalStore((s) => s.gameState.gameInitialized),
  );

  const setSocketState = useGlobalStore((s) => s.setSocketState);

  // Primitive selectors: the game store updates on every hero step.
  const sessionWorld = useGameStore((state) => state.game?.world);
  const sessionAccountId = useGameStore((state) => state.game?.hero.accountId);

  const sessionCharacterId = useGameStore(
    (state) => state.game?.hero.characterId,
  );

  const sessionClanId = useGameStore((state) => state.game?.hero.clan?.id);

  const characterIdentity =
    sessionWorld === undefined ||
    sessionAccountId === undefined ||
    sessionCharacterId === undefined
      ? null
      : getGameSessionIdentity({
          world: sessionWorld,
          accountId: sessionAccountId,
          characterId: sessionCharacterId,
          clan: sessionClanId === undefined ? undefined : { id: sessionClanId },
        });

  const joined =
    characterIdentity !== null && joinedCharacterIdentity === characterIdentity;

  const joinedGuilds = joined ? guildIds : EMPTY_JOINED_GUILDS;

  const previousCharacterIdentity = useRef(characterIdentity);

  useEffect(() => {
    if (previousCharacterIdentity.current === characterIdentity) return;
    const previous = previousCharacterIdentity.current;
    previousCharacterIdentity.current = characterIdentity;

    if (previous !== null) socket.disconnect();

    if (characterIdentity !== null) socket.connect();
  }, [characterIdentity, socket]);

  useEffect(() => {
    setSocketState({ connected, joined, joinedGuilds });
  }, [connected, joined, joinedGuilds, setSocketState]);

  // oxlint-disable-next-line react-doctor/effect-needs-cleanup -- The join callback sets retryTimer only before cleanup, which clears it.
  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const emitJoin = async () => {
      if (gameInitialized && connected) {
        const game = useGameStore.getState().game;

        if (!game) {
          return;
        }

        const { hero, world } = game;
        const { accountId, characterId } = hero;

        if (cancelled || !socket.connected) {
          return;
        }

        const attempt = ++joinAttempt.current;

        await socket
          .join({
            world,
            name: hero.name,
            lvl: hero.level,
            icon: hero.icon,
            prof: hero.profession,
            characterId,
            accountId,
            clan: hero.clan
              ? {
                  id: hero.clan.id,
                  name: hero.clan.name,
                  rank: hero.clan.rank,
                }
              : undefined,
          })
          .catch((error: Error) => {
            if (import.meta.env.DEV)
              console.warn("[Gateway] Failed to join", error);

            // A newer join supersedes this attempt. The closed socket that a
            // refusal leaves behind must still degrade, so this ignores cleanup.
            if (attempt !== joinAttempt.current) return;
            // Load HTTP snapshots instead of waiting for a join that may never
            // succeed, and catch up on missed events once a later join succeeds.
            hasBeenUnavailable.current = true;
            setJoinFailed(true);
            const rejection = describeJoinRejection(error);

            if (rejection && !joinRejectionShown.current) {
              const t = getFixedT("common");
              joinRejectionShown.current = true;
              showRuntimeMessage(`${t("realtimeJoin.rejected")} ${rejection}`);
            }

            // A closed socket reconnects through the realtime client's backoff
            // or, after a non-retryable refusal, through the reconnect button
            // in the connection status. After cleanup, a later run either
            // joins again or has no join to retry.
            if (cancelled || !socket.connected) return;

            const delay = Math.min(
              JOIN_RETRY_MAX_DELAY_MS,
              JOIN_RETRY_BASE_DELAY_MS * 2 ** joinFailures.current,
            );

            joinFailures.current += 1;
            retryTimer = setTimeout(
              () => setJoinRetry((retry) => retry + 1),
              Math.round(delay * (0.5 + Math.random())),
            );
          });
      }
    };

    void emitJoin();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [gameInitialized, connected, socket, characterIdentity, joinRetry]);

  useEffect(() => {
    const accessCache = createGameAccessCache(queryClient);

    const releasePolicies = accessPolicyObservers.map((observer) =>
      observer.retain?.(queryClient),
    );

    let hasJoined = false;
    let joinedConnection = false;

    const handleDisconnect = () => {
      hasBeenUnavailable.current = true;
      joinedConnection = false;
      setJoinedCharacterIdentity(null);
      setJoinedGuilds([]);
    };

    const handleJoin = (data: JoinResult) => {
      setJoinedCharacterIdentity(data.characterIdentity);
      setHasBeenOnline(true);
      setJoinFailed(false);
      joinFailures.current = 0;

      joinRejectionShown.current = false;

      setJoinedGuilds([...data.guildIds]);

      if (!joinedConnection) {
        if (
          hasJoined ||
          hasBeenUnavailable.current ||
          !socket.getAccessPolicy()
        )
          for (const observer of accessPolicyObservers)
            observer.resync?.(queryClient, data.guildIds);
        hasJoined = true;
        joinedConnection = true;
      }
    };

    const handlePermissionsUpdated = (data: AccessUpdate) => {
      accessCache.apply(data.accessPolicy);

      for (const observer of accessPolicyObservers)
        observer.update?.(queryClient, data.accessPolicy);

      setJoinedGuilds(
        data.accessPolicy.organizations.map(
          ({ organizationId }) => organizationId,
        ),
      );
    };

    socket.on("disconnect", handleDisconnect);
    socket.on("join", handleJoin);
    socket.on("access.updated", handlePermissionsUpdated);
    const currentPolicy = socket.getAccessPolicy?.();

    if (currentPolicy)
      handlePermissionsUpdated({ accessPolicy: currentPolicy, changes: [] });
    socket.connect();

    return () => {
      accessCache.dispose();

      for (const release of releasePolicies) release?.();

      socket.off("disconnect", handleDisconnect);
      socket.off("join", handleJoin);
      socket.off("access.updated", handlePermissionsUpdated);
      socket.disconnect();
    };
  }, [socket, accessPolicyObservers]);

  const status = resolveRealtimeConnectionStatus({
    connected,
    hasBeenOnline,
    joined,
    joinFailed,
    state: connectionState,
  });

  return (
    // oxlint-disable-next-line react-doctor/jsx-no-constructed-context-values -- Vite React Compiler caches this object by its fields (vite.shared.ts enables compiler: true).
    <SocketContext.Provider
      value={{ socket, connected, joined, joinedGuilds, status }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

/** Wait for the first subscription before fetching snapshots, with REST fallback after a connection or join failure. */
export const useRealtimeSnapshotReady = () => {
  const { socket, status } = useSocket();

  return socket === null || status !== "connecting";
};
