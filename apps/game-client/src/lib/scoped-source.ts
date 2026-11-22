import type { AppSocket } from "./socket";

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
      queueMicrotask(() => {
        if (this.count === 0) this.stop();
      });
    };
  }
}

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
