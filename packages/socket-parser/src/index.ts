import { encode, decode, ExtensionCodec } from "@msgpack/msgpack";

const PacketType = {
  CONNECT: 0,
  DISCONNECT: 1,
  EVENT: 2,
  ACK: 3,
  CONNECT_ERROR: 4,
  BINARY_EVENT: 5,
  BINARY_ACK: 6,
} as const;

const VALID_PACKET_TYPES = new Set<number>(Object.values(PacketType));

// Custom extension codec to handle undefined properly
const extensionCodec = new ExtensionCodec();

// Extension type 0 for undefined
extensionCodec.register({
  type: 0,
  encode: (input: unknown) => {
    if (input === undefined) {
      return new Uint8Array(0);
    }
    return null;
  },
  decode: () => undefined,
});

interface Packet {
  type: number;
  nsp: string;
  data?: unknown;
  id?: number;
}

const isPacketRecord = (decoded: unknown): decoded is Record<string, unknown> =>
  typeof decoded === "object" && decoded !== null && !Array.isArray(decoded);

const isValidPacketType = (type: unknown): type is number =>
  typeof type === "number" && VALID_PACKET_TYPES.has(type);

const isValidPacketId = (id: unknown): id is number | undefined =>
  id === undefined || typeof id === "number";

class MsgpackEncoder {
  encode(packet: unknown) {
    return [encode(packet, { extensionCodec })];
  }
}

type EventCallback = (...args: unknown[]) => void;

class MsgpackDecoder {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback) {
    const callbacks = this.listeners.get(event) ?? [];
    callbacks.push(callback);
    this.listeners.set(event, callbacks);
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Alias for off() - required by Socket.IO
  removeListener(event: string, callback: EventCallback) {
    this.off(event, callback);
  }

  // Alias for on() - for compatibility
  addListener(event: string, callback: EventCallback) {
    this.on(event, callback);
  }

  private emit(event: string, ...args: unknown[]) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(...args);
      }
    }
  }

  add(obj: Uint8Array | ArrayLike<number>) {
    const input = obj instanceof Uint8Array ? obj : new Uint8Array(obj);
    const decoded = decode(input, { extensionCodec });

    this.checkPacket(decoded);
    const packet = decoded;

    if (packet.data === null) {
      packet.data = undefined;
    }

    this.emit("decoded", packet);
  }

  private checkPacket(decoded: unknown): asserts decoded is Packet {
    if (!isPacketRecord(decoded)) {
      throw new Error("invalid packet");
    }

    if (!isValidPacketType(decoded.type)) {
      throw new Error("invalid packet type");
    }

    if (typeof decoded.nsp !== "string") {
      throw new Error("invalid namespace");
    }

    if (!isValidPacketId(decoded.id)) {
      throw new Error("invalid packet id");
    }
  }

  destroy() {
    this.listeners.clear();
  }
}

export const msgpackParser = {
  protocol: 5,
  Encoder: MsgpackEncoder,
  Decoder: MsgpackDecoder,
};

export { encode, decode } from "@msgpack/msgpack";
