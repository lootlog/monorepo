import { ConnectionService } from "./connection.service.js";
import { Platform } from "../enums/platform.enum.js";

describe("ConnectionService", () => {
  let service: ConnectionService;

  beforeEach(() => {
    service = new ConnectionService();
  });

  it("extracts connection metadata and detects game platform without trusting auth headers", () => {
    const metadata = service.getConnectionMetadata({
      headers: {
        "x-auth-discord-id": "discord-1",
        "x-auth-user-id": "user-1",
        origin: "https://alpha.margonem.pl",
      },
    } as never);

    expect(metadata).toEqual({
      platform: Platform.GAME,
    });
  });

  it("ignores spoofed auth identity headers", () => {
    const metadata = service.getConnectionMetadata({
      headers: {
        "x-auth-discord-id": ["discord-1", "discord-2"],
        "x-auth-user-id": ["user-1", "user-2"],
        origin: "https://alpha.margonem.pl",
      },
    } as never);

    expect(metadata).toEqual({ platform: Platform.GAME });
  });

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
