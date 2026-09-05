import type { ServerEvent } from "@lootlog/protocol/realtime";

type Listener = (...arguments_: never[]) => void;

export const unwrapOrganizationEvent = (event: ServerEvent): unknown => {
  if (!event.data || typeof event.data !== "object") return event.data;
  return "payload" in event.data ? event.data.payload : event.data;
};

export class RealtimeEventListeners<Event extends string> {
  private readonly listeners = new Map<Event, Set<Listener>>();

  add(event: Event, listener: Listener): void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  delete(event: Event, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  has(event: Event): boolean {
    return (this.listeners.get(event)?.size ?? 0) > 0;
  }

  clear(): void {
    this.listeners.clear();
  }

  emit(event: Event, payload?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) {
      (listener as (value?: unknown) => void)(payload);
    }
  }
}
