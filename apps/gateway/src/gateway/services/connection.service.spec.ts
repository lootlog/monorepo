import { ConnectionService } from "./connection.service";
import { Platform } from "../enums/platform.enum";
import { env } from "src/config/env";
import { RuntimeEnvironment } from "src/types/common.types";

describe("ConnectionService", () => {
  let service: ConnectionService;
  const originalEnv = env.ENV;
  const originalDevPermissionOverrideEnabled =
    env.DEV_PERMISSION_OVERRIDE_ENABLED;

  beforeEach(() => {
    env.ENV = RuntimeEnvironment.LOCAL;
    env.DEV_PERMISSION_OVERRIDE_ENABLED = false;
    service = new ConnectionService();
  });

  afterEach(() => {
    env.ENV = originalEnv;
    env.DEV_PERMISSION_OVERRIDE_ENABLED = originalDevPermissionOverrideEnabled;
  });

  it("extracts connection metadata and detects game platform", () => {
    const metadata = service.getConnectionMetadata({
      headers: {
        "x-auth-discord-id": "discord-1",
        "x-auth-user-id": "user-1",
        origin: "https://alpha.margonem.pl",
      },
    } as never);

    expect(metadata).toEqual({
      discordId: "discord-1",
      userId: "user-1",
      platform: Platform.GAME,
    });
  });

  it("ignores dev permission override auth when the gateway flag is disabled", () => {
    const metadata = service.getConnectionMetadata(
      {
        headers: {
          "x-auth-discord-id": "discord-1",
          "x-auth-user-id": "user-1",
          origin: "https://alpha.margonem.pl",
        },
      } as never,
      { devPermissionOverride: "encoded-override" },
    );

    expect(metadata.devPermissionOverride).toBeUndefined();
  });

  it("accepts dev permission override auth when the gateway flag is enabled", () => {
    env.DEV_PERMISSION_OVERRIDE_ENABLED = true;

    const metadata = service.getConnectionMetadata(
      {
        headers: {
          "x-auth-discord-id": "discord-1",
          "x-auth-user-id": "user-1",
          origin: "https://alpha.margonem.pl",
        },
      } as never,
      { devPermissionOverride: "encoded-override" },
    );

    expect(metadata.devPermissionOverride).toBe("encoded-override");
  });

  it.each([RuntimeEnvironment.STAGING, RuntimeEnvironment.PROD])(
    "keeps dev permission override auth disabled in %s",
    (runtimeEnvironment) => {
      env.ENV = runtimeEnvironment;
      env.DEV_PERMISSION_OVERRIDE_ENABLED = true;

      const metadata = service.getConnectionMetadata(
        {
          headers: {
            "x-auth-discord-id": "discord-1",
            "x-auth-user-id": "user-1",
            origin: "https://alpha.margonem.pl",
          },
        } as never,
        { devPermissionOverride: "encoded-override" },
      );

      expect(metadata.devPermissionOverride).toBeUndefined();
    },
  );

  it("detects web app platform for non-game origins", () => {
    expect(service.determineUserPlatform("https://lootlog.com")).toBe(
      Platform.WEB_APP,
    );
  });

  it("returns unknown platform when origin is missing", () => {
    expect(service.determineUserPlatform(undefined)).toBe(Platform.UNKNOWN);
  });

  it("rejects connections without discord id", () => {
    expect(service.validateConnection(null, Platform.GAME)).toEqual({
      valid: false,
      reason: "No discordId",
    });
  });

  it("rejects connections from unknown platforms", () => {
    expect(service.validateConnection("discord-1", Platform.UNKNOWN)).toEqual({
      valid: false,
      reason: "Unknown platform",
    });
  });

  it("accepts connections with discord id and known platform", () => {
    expect(service.validateConnection("discord-1", Platform.WEB_APP)).toEqual({
      valid: true,
    });
  });
});
