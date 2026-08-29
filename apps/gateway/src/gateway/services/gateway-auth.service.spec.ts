import { of, throwError } from "rxjs";
import type { HttpService } from "@nestjs/axios";
import { GatewayAuthService } from "./gateway-auth.service.js";
import { env } from "#src/config/env";
import { ConnectionService } from "./connection.service.js";
import { Platform } from "../enums/platform.enum.js";

describe("GatewayAuthService", () => {
  const get = vi.fn();
  let service: GatewayAuthService;

  beforeEach(() => {
    get.mockReset();
    env.AUTH_URL = "http://auth:4001";
    service = new GatewayAuthService(
      { get } as unknown as HttpService,
      new ConnectionService(),
    );
  });

  it("verifies websocket identity with only cookie and authorization headers", async () => {
    get.mockReturnValue(
      of({
        headers: {
          "x-auth-discord-id": "discord-1",
          "x-auth-user-id": "user-1",
        },
      }),
    );

    await expect(
      service.verifyConnectionIdentity({
        headers: {
          authorization: "Bearer real-token",
          cookie: "session=real",
          "x-auth-discord-id": "spoofed-discord",
          "x-auth-user-id": "spoofed-user",
        },
      } as never),
    ).resolves.toEqual({
      discordId: "discord-1",
      userId: "user-1",
    });

    expect(get).toHaveBeenCalledWith("http://auth:4001/auth/verify", {
      headers: {
        authorization: "Bearer real-token",
        cookie: "session=real",
      },
      timeout: 10000,
    });
  });

  it.each([
    { credentials: { cookie: "session=real" }, method: "cookie" },
    {
      credentials: { authorization: "Bearer real-token" },
      method: "bearer token",
    },
  ])("verifies websocket identity with a $method", async ({ credentials }) => {
    get.mockReturnValue(
      of({
        headers: {
          "x-auth-discord-id": "discord-1",
          "x-auth-user-id": "user-1",
        },
      }),
    );

    await expect(
      service.verifyConnectionIdentity({ headers: credentials } as never),
    ).resolves.toEqual({ discordId: "discord-1", userId: "user-1" });
    expect(get).toHaveBeenCalledWith("http://auth:4001/auth/verify", {
      headers: credentials,
      timeout: 10000,
    });
  });

  it("rejects direct sockets that only spoof trusted auth headers", async () => {
    await expect(
      service.verifyConnectionIdentity({
        headers: {
          "x-auth-discord-id": "spoofed-discord",
          "x-auth-user-id": "spoofed-user",
        },
      } as never),
    ).resolves.toBeNull();

    expect(get).not.toHaveBeenCalled();
  });

  it("returns null when auth verification fails", async () => {
    get.mockReturnValue(throwError(() => new Error("unauthorized")));

    await expect(
      service.verifyConnectionIdentity({
        headers: { cookie: "session=expired" },
      } as never),
    ).resolves.toBeNull();
  });

  it.each([
    {
      headers: { "x-auth-discord-id": "", "x-auth-user-id": "user-1" },
      description: "empty discordId",
    },
    {
      headers: {
        "x-auth-discord-id": "discord-1",
        "x-auth-user-id": "   ",
      },
      description: "blank userId",
    },
    {
      headers: { "x-auth-discord-id": "discord-1" },
      description: "missing userId",
    },
  ])("rejects auth identity with $description", async ({ headers }) => {
    get.mockReturnValue(of({ headers }));

    await expect(
      service.verifyConnectionIdentity({
        headers: { cookie: "session=real" },
      } as never),
    ).resolves.toBeNull();
  });

  it("initializes complete authenticated socket data", async () => {
    get.mockReturnValue(
      of({
        headers: {
          "x-auth-discord-id": "discord-1",
          "x-auth-user-id": "user-1",
        },
      }),
    );
    const client = {
      id: "socket-1",
      request: {
        headers: {
          authorization: "Bearer real-token",
          origin: "https://lootlog.com",
        },
      },
      data: {},
    };

    await expect(service.authenticateConnection(client as never)).resolves.toBe(
      true,
    );
    expect(client.data).toEqual({
      discordId: "discord-1",
      userId: "user-1",
      sessionId: "socket-1",
      platform: Platform.WEB_APP,
    });
  });

  it("rejects a socket without credentials before calling auth", async () => {
    const client = {
      id: "socket-1",
      request: { headers: { origin: "https://lootlog.com" } },
      data: {},
    };

    await expect(service.authenticateConnection(client as never)).resolves.toBe(
      false,
    );
    expect(get).not.toHaveBeenCalled();
    expect(client.data).toEqual({});
  });

  it("rejects a socket when auth verification fails", async () => {
    get.mockReturnValue(throwError(() => new Error("unauthorized")));
    const client = {
      id: "socket-1",
      request: {
        headers: {
          cookie: "session=expired",
          origin: "https://lootlog.com",
        },
      },
      data: {},
    };

    await expect(service.authenticateConnection(client as never)).resolves.toBe(
      false,
    );
    expect(client.data).toEqual({});
  });

  it("rejects incomplete identity even if the typed auth boundary is violated", async () => {
    vi.spyOn(service, "verifyConnectionIdentity").mockResolvedValue({
      discordId: "discord-1",
      userId: "",
    });
    const client = {
      id: "socket-1",
      request: {
        headers: {
          cookie: "session=real",
          origin: "https://lootlog.com",
        },
      },
      data: {},
    };

    await expect(service.authenticateConnection(client as never)).resolves.toBe(
      false,
    );
    expect(client.data).toEqual({});
  });

  it("rejects a socket from an unknown platform", async () => {
    get.mockReturnValue(
      of({
        headers: {
          "x-auth-discord-id": "discord-1",
          "x-auth-user-id": "user-1",
        },
      }),
    );
    const client = {
      id: "socket-1",
      request: { headers: { cookie: "session=real" } },
      data: {},
    };

    await expect(service.authenticateConnection(client as never)).resolves.toBe(
      false,
    );
    expect(client.data).toEqual({});
  });
});
