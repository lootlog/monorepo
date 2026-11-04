import type { RealtimeWebSocket } from "@lootlog/client/realtime";
import type { RealtimeFrame } from "@lootlog/protocol/realtime";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";

type WireEvent = Parameters<RealtimeWebSocket["addEventListener"]>[0];

type WireListener = Parameters<RealtimeWebSocket["addEventListener"]>[1];

export class RealtimeWire implements RealtimeWebSocket {
  readyState = 0;
  readonly frames: ReturnType<typeof decodeRealtimeFrame>[] = [];
  private readonly listeners = new Map<WireEvent, WireListener>();

  addEventListener(type: WireEvent, listener: WireListener): void {
    this.listeners.set(type, listener);
  }

  send(data: string): void {
    this.frames.push(decodeRealtimeFrame(data));
  }

  receive(frame: RealtimeFrame): void {
    this.receiveText(encodeRealtimeFrame(frame));
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
