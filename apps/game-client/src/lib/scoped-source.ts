import type { AppSocket } from "./socket";

/**
 * Returns one source per socket, Lootlog and world, created on first use, so
 * every reader of a scope shares its subscription and snapshot.
 */
export function createScopedSourceRegistry<Source>(
  create: (socket: AppSocket, guildId: string, world: string) => Source,
): (socket: AppSocket, guildId: string, world: string) => Source {
  const sources = new WeakMap<AppSocket, Map<string, Source>>();

  return (socket, guildId, world) => {
    let scopes = sources.get(socket);

    if (!scopes) {
      scopes = new Map();
      sources.set(socket, scopes);
    }

    const key = JSON.stringify([guildId, world]);
    let source = scopes.get(key);

    if (!source) {
      source = create(socket, guildId, world);
      scopes.set(key, source);
    }

    return source;
  };
}

/**
 * Counts the readers of a source and stops it once the last one released it.
 * Each release counts once.
 */
export class SourceReferences {
  private count = 0;

  constructor(private readonly stop: () => void) {}

  retain(): () => void {
    this.count += 1;
    let retained = true;

    return () => {
      if (!retained) return;
      retained = false;
      this.count -= 1;
      // React may replace a subscription during the same commit.
      queueMicrotask(() => {
        if (this.count === 0) this.stop();
      });
    };
  }
}

/** Listeners by key; a key is dropped with its last listener. */
export class KeyedListeners<Key> {
  private readonly listenersByKey = new Map<Key, Set<() => void>>();

  add(key: Key, listener: () => void): () => void {
    let listeners = this.listenersByKey.get(key);

    if (!listeners) {
      listeners = new Set();
      this.listenersByKey.set(key, listeners);
    }

    listeners.add(listener);

    return () => {
      listeners.delete(listener);

      if (listeners.size === 0) this.listenersByKey.delete(key);
    };
  }

  notify(key: Key): void {
    for (const listener of this.listenersByKey.get(key) ?? []) listener();
  }

  notifyAll(): void {
    for (const listeners of this.listenersByKey.values()) {
      for (const listener of listeners) listener();
    }
  }
}
