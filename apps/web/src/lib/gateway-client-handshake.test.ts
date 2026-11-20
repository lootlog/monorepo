import { afterEach, describe, expect, it, vi } from "vitest";
import { REALTIME_JSON_SUBPROTOCOL } from "@lootlog/client/realtime";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("web realtime handshake", () => {
  it("opens a JSON WebSocket directly without an HTTP credential request", async () => {
    vi.stubEnv("VITE_GATEWAY_URL", "https://gateway.example.test");
    vi.stubEnv("VITE_GATEWAY_SOCKET_PATH", "/ws");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const handshakes: Array<{ url: string; protocols?: string[] }> = [];
    vi.stubGlobal(
      "WebSocket",
      class extends EventTarget {
        readyState = 0;
        constructor(url: string, protocols?: string[]) {
          super();
          handshakes.push({ url, protocols });
        }
        close() {
          this.readyState = 3;
        }
      },
    );
    const { socket: client } = await import("./gateway-client");

    try {
      client.connect();
      expect(handshakes).toEqual([
        {
          url: "wss://gateway.example.test/ws",
          protocols: [REALTIME_JSON_SUBPROTOCOL],
        },
      ]);
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      client.disconnect();
    }
  });
});
