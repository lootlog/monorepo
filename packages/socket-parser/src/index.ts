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

function isValidPacketType(type: unknown): type is number {
  return (
    typeof type === "number" &&
    type >= PacketType.CONNECT &&
    type <= PacketType.BINARY_ACK
  );
}

function isValidPacketId(id: unknown): id is number | undefined {
  return id === undefined || typeof id === "number";
}

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

class MsgpackEncoder {
  encode(packet: unknown): Uint8Array[] {
    return [encode(packet, { extensionCodec })];
  }
}

type EventCallback = (...args: unknown[]) => void;

class MsgpackDecoder {
  private listeners: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event) ?? [];
    callbacks.push(callback);
    this.listeners.set(event, callbacks);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Alias for off() - required by Socket.IO
  removeListener(event: string, callback: EventCallback): void {
    this.off(event, callback);
  }

  // Alias for on() - for compatibility
  addListener(event: string, callback: EventCallback): void {
    this.on(event, callback);
  }

  private emit(event: string, ...args: unknown[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(...args);
      }
    }
  }

  add(obj: Uint8Array | ArrayLike<number>): void {
    const input = obj instanceof Uint8Array ? obj : new Uint8Array(obj);
    const decoded = decode(input, { extensionCodec }) as Packet;

    // Convert null data to undefined (msgpack encodes undefined as null by default)
    if (decoded.data === null) {
      decoded.data = undefined;
    }

    this.checkPacket(decoded);
    this.emit("decoded", decoded);
  }

  private checkPacket(decoded: Packet): void {
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

  destroy(): void {
    this.listeners.clear();
  }
}

export const msgpackParser = {
  protocol: 5,
  Encoder: MsgpackEncoder,
  Decoder: MsgpackDecoder,
};

export { encode, decode } from "@msgpack/msgpack";
