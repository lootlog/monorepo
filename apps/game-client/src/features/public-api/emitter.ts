type Listener<T> = (payload: T) => void;

export class Emitter<EventMap extends Record<string, unknown>> {
  private listeners = new Map<keyof EventMap, Set<Listener<never>>>();

  on<E extends keyof EventMap>(
    event: E,
    fn: Listener<EventMap[E]>,
  ): () => void {
    let listeners = this.listeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(event, listeners);
    }
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }

  emit<E extends keyof EventMap>(event: E, payload: EventMap[E]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        // SAFETY: on() stores each listener only under its matching EventMap key; emit() reads that same key.
        (fn as Listener<EventMap[E]>)(payload);
      } catch (error) {
        console.warn("[LootlogAPI]", error);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
