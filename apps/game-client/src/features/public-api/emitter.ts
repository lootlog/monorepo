type Listener<T> = (payload: T) => void;

export class Emitter<EventMap extends Record<string, unknown>> {
  private listeners = new Map<keyof EventMap, Set<Listener<never>>>();

  on<E extends keyof EventMap>(
    event: E,
    fn: Listener<EventMap[E]>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(fn as Listener<never>);
    return () => {
      set.delete(fn as Listener<never>);
    };
  }

  emit<E extends keyof EventMap>(event: E, payload: EventMap[E]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        (fn as Listener<EventMap[E]>)(payload);
      } catch (e) {
        console.error("[LootlogAPI]", e);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
