import { isApiError } from "@/lib/api-client";
import { userLootlogConfigControllerGetPlayersCatchingGuilds } from "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config";
import type {
  UserLootlogPlayersCatchingGuildsRequestDtoPlayersItem,
  UserLootlogPlayersCatchingGuildsResponseDtoOutput,
} from "@/lib/api/generated/main/model";
import {
  type CharacterTooltipCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "@/store/character-tooltip-catching-guilds.store";

export const CATCHING_GUILDS_BATCH_SIZE = 100;
export const CATCHING_GUILDS_CACHE_TIME_MS = 60_000;
export const CATCHING_GUILDS_REQUEST_TIMEOUT_MS = 5_000;
export const CATCHING_GUILDS_RETRY_DELAY_MS = 300;
export const CATCHING_GUILDS_FAILURE_TTL_MS = 5 * 60 * 1000;
export const CATCHING_GUILDS_FAILURE_CAP = 500;

type FailedActivation = {
  activation: number;
  failedAt: number;
};

type FetchPlayersCatchingGuilds = (
  players: UserLootlogPlayersCatchingGuildsRequestDtoPlayersItem[],
  signal: AbortSignal,
) => Promise<UserLootlogPlayersCatchingGuildsResponseDtoOutput>;

type CoordinatorDependencies = {
  fetchPlayersCatchingGuilds: FetchPlayersCatchingGuilds;
  now: () => number;
  requestTimeoutMs: number;
  retryDelayMs: number;
  sleep: (delayMs: number) => Promise<void>;
};

const defaultDependencies: CoordinatorDependencies = {
  fetchPlayersCatchingGuilds: (players, signal) =>
    userLootlogConfigControllerGetPlayersCatchingGuilds(
      { players },
      { signal },
    ),
  now: () => Date.now(),
  requestTimeoutMs: CATCHING_GUILDS_REQUEST_TIMEOUT_MS,
  retryDelayMs: CATCHING_GUILDS_RETRY_DELAY_MS,
  sleep: (delayMs) =>
    new Promise((resolve) => {
      globalThis.setTimeout(resolve, delayMs);
    }),
};

function isRetryableRequestError(error: unknown): boolean {
  if (!isApiError(error)) {
    return false;
  }

  return (
    error.status === undefined || error.status === 429 || error.status >= 500
  );
}

class CatchingGuildsRequestTimeoutError extends Error {
  constructor() {
    super("Catching guilds request timed out");
    this.name = "CatchingGuildsRequestTimeoutError";
  }
}

function toRequestPlayer(
  target: CharacterTooltipCatchingGuildsTarget,
): UserLootlogPlayersCatchingGuildsRequestDtoPlayersItem {
  return {
    userId: target.userId,
    accountId: target.accountId,
    characterId: target.characterId,
  };
}

export class CharacterTooltipCatchingGuildsCoordinator {
  private readonly dependencies: CoordinatorDependencies;
  private active = false;
  private activation = 0;
  private inFlight = false;
  private readonly inFlightRequestKeys = new Set<string>();
  private readonly queuedRequestKeys = new Set<string>();
  private queue: CharacterTooltipCatchingGuildsTarget[] = [];
  private readonly failedActivationByRequestKey = new Map<
    string,
    FailedActivation
  >();
  private visibleTargetsByRequestKey = new Map<
    string,
    CharacterTooltipCatchingGuildsTarget
  >();
  private lifecycleGeneration = 0;
  private readonly activeAbortControllers = new Set<AbortController>();

  constructor(dependencies: Partial<CoordinatorDependencies> = {}) {
    this.dependencies = { ...defaultDependencies, ...dependencies };
  }

  dispose(): void {
    this.lifecycleGeneration += 1;
    this.active = false;
    this.activation = 0;
    this.inFlight = false;
    this.queue = [];
    this.inFlightRequestKeys.clear();
    this.queuedRequestKeys.clear();
    this.failedActivationByRequestKey.clear();
    this.visibleTargetsByRequestKey.clear();
    for (const abortController of this.activeAbortControllers) {
      abortController.abort();
    }
    this.activeAbortControllers.clear();
  }

  sync(targets: CharacterTooltipCatchingGuildsTarget[], active: boolean): void {
    if (active && !this.active) {
      this.activation += 1;
    }
    this.active = active;
    const visibleTargets = active ? targets : [];
    this.visibleTargetsByRequestKey = new Map(
      visibleTargets.map((target) => [target.requestKey, target]),
    );
    useCharacterTooltipCatchingGuildsStore.getState().pruneEntries(
      visibleTargets.map((target) => target.key),
      this.dependencies.now(),
    );
    this.pruneFailedActivations(this.dependencies.now());

    if (!active) {
      this.queue = [];
      this.queuedRequestKeys.clear();
      return;
    }

    for (const target of this.visibleTargetsByRequestKey.values()) {
      this.prepareTarget(target);
    }

    this.processQueue();
  }

  prioritize(target: CharacterTooltipCatchingGuildsTarget): void {
    const store = useCharacterTooltipCatchingGuildsStore.getState();
    const entry = store.entriesByKey[target.key];
    if (entry?.requestKey !== target.requestKey) {
      store.setIdle(target);
    }

    const currentEntry =
      useCharacterTooltipCatchingGuildsStore.getState().entriesByKey[
        target.key
      ];
    if (
      currentEntry?.status === "success" &&
      currentEntry.fetchedAt !== undefined &&
      this.dependencies.now() - currentEntry.fetchedAt <
        CATCHING_GUILDS_CACHE_TIME_MS
    ) {
      return;
    }

    if (this.inFlightRequestKeys.has(target.requestKey)) {
      return;
    }

    this.removeQueuedTarget(target.requestKey);
    this.visibleTargetsByRequestKey.set(target.requestKey, target);
    this.queue.unshift(target);
    this.queuedRequestKeys.add(target.requestKey);
    this.processQueue(true);
  }

  private prepareTarget(target: CharacterTooltipCatchingGuildsTarget): void {
    const store = useCharacterTooltipCatchingGuildsStore.getState();
    let entry = store.entriesByKey[target.key];
    if (entry?.requestKey !== target.requestKey) {
      store.setIdle(target);
      entry =
        useCharacterTooltipCatchingGuildsStore.getState().entriesByKey[
          target.key
        ];
    }

    if (
      this.queuedRequestKeys.has(target.requestKey) ||
      this.inFlightRequestKeys.has(target.requestKey)
    ) {
      return;
    }

    const successIsFresh =
      entry?.status === "success" &&
      entry.fetchedAt !== undefined &&
      this.dependencies.now() - entry.fetchedAt < CATCHING_GUILDS_CACHE_TIME_MS;
    if (successIsFresh) {
      return;
    }

    if (
      entry?.status === "error" &&
      this.failedActivationByRequestKey.get(target.requestKey)?.activation ===
        this.activation
    ) {
      return;
    }

    this.queue.push(target);
    this.queuedRequestKeys.add(target.requestKey);
  }

  private processQueue(force = false): void {
    if ((!this.active && !force) || this.inFlight) {
      return;
    }

    const batch: CharacterTooltipCatchingGuildsTarget[] = [];
    while (this.queue.length > 0 && batch.length < CATCHING_GUILDS_BATCH_SIZE) {
      const target = this.queue.shift();
      if (!target) break;

      this.queuedRequestKeys.delete(target.requestKey);
      const visibleTarget = this.visibleTargetsByRequestKey.get(
        target.requestKey,
      );
      if (!visibleTarget) continue;

      batch.push(visibleTarget);
    }

    if (batch.length === 0) {
      return;
    }

    this.inFlight = true;
    const store = useCharacterTooltipCatchingGuildsStore.getState();
    for (const target of batch) {
      this.inFlightRequestKeys.add(target.requestKey);
      store.setLoading(target);
    }

    const lifecycleGeneration = this.lifecycleGeneration;
    void this.fetchBatch(batch, lifecycleGeneration).finally(() => {
      if (lifecycleGeneration !== this.lifecycleGeneration) {
        return;
      }

      for (const target of batch) {
        this.inFlightRequestKeys.delete(target.requestKey);
      }
      this.inFlight = false;
      this.processQueue();
    });
  }

  private async fetchBatch(
    batch: CharacterTooltipCatchingGuildsTarget[],
    lifecycleGeneration: number,
  ): Promise<void> {
    try {
      const response = await this.fetchWithRetry(
        batch.map(toRequestPlayer),
        lifecycleGeneration,
      );
      if (lifecycleGeneration !== this.lifecycleGeneration) {
        return;
      }
      const playersByRequestKey = new Map(
        response.players.map((player) => [
          `${player.userId}:${player.accountId}:${player.characterId}`,
          player,
        ]),
      );
      const store = useCharacterTooltipCatchingGuildsStore.getState();
      const fetchedAt = this.dependencies.now();

      for (const target of batch) {
        const player = playersByRequestKey.get(target.requestKey);
        if (!player) {
          this.recordFailedActivation(target.requestKey);
          store.setError(target);
          continue;
        }

        this.failedActivationByRequestKey.delete(target.requestKey);
        store.setSuccess(target, player.guilds, fetchedAt);
      }
    } catch {
      if (lifecycleGeneration !== this.lifecycleGeneration) {
        return;
      }

      const store = useCharacterTooltipCatchingGuildsStore.getState();
      for (const target of batch) {
        this.recordFailedActivation(target.requestKey);
        store.setError(target);
      }
    }
  }

  private async fetchWithRetry(
    players: UserLootlogPlayersCatchingGuildsRequestDtoPlayersItem[],
    lifecycleGeneration: number,
  ): Promise<UserLootlogPlayersCatchingGuildsResponseDtoOutput> {
    try {
      return await this.fetchAttempt(players);
    } catch (error) {
      if (
        !(error instanceof CatchingGuildsRequestTimeoutError) &&
        !isRetryableRequestError(error)
      ) {
        throw error;
      }
    }

    await this.dependencies.sleep(this.dependencies.retryDelayMs);
    if (lifecycleGeneration !== this.lifecycleGeneration) {
      throw new Error("Catching guilds coordinator lifecycle changed");
    }
    return this.fetchAttempt(players);
  }

  private async fetchAttempt(
    players: UserLootlogPlayersCatchingGuildsRequestDtoPlayersItem[],
  ): Promise<UserLootlogPlayersCatchingGuildsResponseDtoOutput> {
    const abortController = new AbortController();
    this.activeAbortControllers.add(abortController);
    const timeoutId = globalThis.setTimeout(
      () => abortController.abort(),
      this.dependencies.requestTimeoutMs,
    );

    try {
      return await this.dependencies.fetchPlayersCatchingGuilds(
        players,
        abortController.signal,
      );
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new CatchingGuildsRequestTimeoutError();
      }

      throw error;
    } finally {
      globalThis.clearTimeout(timeoutId);
      this.activeAbortControllers.delete(abortController);
    }
  }

  private removeQueuedTarget(requestKey: string): void {
    if (!this.queuedRequestKeys.delete(requestKey)) {
      return;
    }

    this.queue = this.queue.filter(
      (queuedTarget) => queuedTarget.requestKey !== requestKey,
    );
  }

  private recordFailedActivation(requestKey: string): void {
    const now = this.dependencies.now();
    this.failedActivationByRequestKey.set(requestKey, {
      activation: this.activation,
      failedAt: now,
    });
    this.pruneFailedActivations(now);
  }

  private pruneFailedActivations(now: number): void {
    for (const [requestKey, failure] of this.failedActivationByRequestKey) {
      if (now - failure.failedAt > CATCHING_GUILDS_FAILURE_TTL_MS) {
        this.failedActivationByRequestKey.delete(requestKey);
      }
    }

    if (this.failedActivationByRequestKey.size <= CATCHING_GUILDS_FAILURE_CAP) {
      return;
    }

    const retainedRequestKeys = new Set(
      [...this.failedActivationByRequestKey.entries()]
        .sort(([, first], [, second]) => second.failedAt - first.failedAt)
        .slice(0, CATCHING_GUILDS_FAILURE_CAP)
        .map(([requestKey]) => requestKey),
    );

    for (const requestKey of this.failedActivationByRequestKey.keys()) {
      if (!retainedRequestKeys.has(requestKey)) {
        this.failedActivationByRequestKey.delete(requestKey);
      }
    }
  }
}

export const characterTooltipCatchingGuildsCoordinator =
  new CharacterTooltipCatchingGuildsCoordinator();
