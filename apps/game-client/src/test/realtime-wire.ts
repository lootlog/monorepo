import type { RealtimeWebSocket } from "@lootlog/client/realtime";
import {
  decodeRealtimeFrame,
  type RealtimeFrame,
} from "@lootlog/protocol/realtime";

type WireEvent = Parameters<RealtimeWebSocket["addEventListener"]>[0];

type WireListener = Parameters<RealtimeWebSocket["addEventListener"]>[1];

/** A frame as the gateway sends it. */
export const encodeFrame = (frame: RealtimeFrame): string =>
  JSON.stringify(frame);

/** A frame the client sent. */
export const decodeFrame = (text: string) =>
  decodeRealtimeFrame(JSON.parse(text));

export class RealtimeWire implements RealtimeWebSocket {
  readyState = 0;
  readonly frames: ReturnType<typeof decodeFrame>[] = [];
  private readonly listeners = new Map<WireEvent, WireListener>();

  addEventListener(type: WireEvent, listener: WireListener): void {
    this.listeners.set(type, listener);
  }

  send(data: string): void {
    this.frames.push(decodeFrame(data));
  }

  receive(frame: RealtimeFrame): void {
    this.receiveText(encodeFrame(frame));
  }

  receiveText(data: string): void {
    this.listeners.get("message")?.({ data });
  }

  open(): void {
    this.readyState = 1;
    this.listeners.get("open")?.({});
  }

  close(): void {
    this.readyState = 3;
    this.listeners.get("close")?.({});
  }
}
