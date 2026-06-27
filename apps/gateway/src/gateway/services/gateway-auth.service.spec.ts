import { of, throwError } from "rxjs";
import type { HttpService } from "@nestjs/axios";
import { GatewayAuthService } from "./gateway-auth.service";
import { env } from "src/config/env";

describe("GatewayAuthService", () => {
  const get = vi.fn();
  let service: GatewayAuthService;

  beforeEach(() => {
    env.AUTH_URL = "http://auth:4001";
    service = new GatewayAuthService({ get } as unknown as HttpService);
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
});
