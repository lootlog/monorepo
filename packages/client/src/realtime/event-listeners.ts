import type {
  ServerEvent,
  ServerEventPayload,
} from "@lootlog/protocol/realtime";
import { notifyListeners } from "./notify-listeners.js";

type Listener<Payload> = (payload: Payload) => void;

export const unwrapOrganizationEvent = <Event extends ServerEvent>(
  event: Event,
): ServerEventPayload<Event["type"]> =>
  // SAFETY: only Organization events carry `payload`, whose shape the
  // protocol names for each type.
  ("payload" in event.data
    ? event.data.payload
    : event.data) as ServerEventPayload<Event["type"]>;

export class RealtimeEventListeners<Events extends object> {
  private readonly listeners = new Map<keyof Events, Set<Listener<never>>>();

  add<Event extends keyof Events>(
    event: Event,
    listener: Listener<Events[Event]>,
  ): void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  delete<Event extends keyof Events>(
    event: Event,
    listener: Listener<Events[Event]>,
  ): void {
    this.listeners.get(event)?.delete(listener);
  }

  has(event: keyof Events): boolean {
    return (this.listeners.get(event)?.size ?? 0) > 0;
  }

  clear(): void {
    this.listeners.clear();
  }

  emit<Event extends keyof Events>(event: Event, payload: Events[Event]): void {
    const emitToListener = (listener: Listener<never>) =>
      Reflect.apply(listener, undefined, [payload]);

    notifyListeners(
      this.listeners.get(event) ?? [],
      emitToListener,
      `event ${String(event)}`,
    );
  }
}
