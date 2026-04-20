import { AuthService } from "./auth.service";
import { validateToken } from "@lootlog/api-helpers";

vi.mock("@lootlog/api-helpers", () => ({
  validateToken:
    vi.fn<(input: unknown) => Promise<{ userId: string; discordId: string }>>(),
}));

vi.mock("./better-auth", () => ({
  auth: {
    api: {
      getJwks: vi
        .fn<() => Promise<{ keys: never[] }>>()
        .mockResolvedValue({ keys: [] }),
      getAccessToken: vi.fn<() => Promise<unknown>>(),
    },
  },
}));

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    vi.clearAllMocks();
  });

  describe("normalizeScopes", () => {
    it("keeps string scopes from arrays", () => {
      expect(service.normalizeScopes(["guilds", 123, "email"])).toEqual([
        "guilds",
        "email",
      ]);
    });

    it("splits string scopes on whitespace", () => {
      expect(service.normalizeScopes("guilds email")).toEqual([
        "guilds",
        "email",
      ]);
    });

    it("returns an empty array for unsupported values", () => {
      expect(service.normalizeScopes(null)).toEqual([]);
    });
  });

  describe("buildVerifiedIdentityFromRequest", () => {
    it("prefers the existing session", async () => {
      const result = await service.buildVerifiedIdentityFromRequest(
        {
          session: {} as never,
          user: {
            id: "user-1",
            discordId: "discord-1",
          } as never,
        },
        "Bearer ignored",
      );

      expect(result).toEqual({
        userId: "user-1",
        discordId: "discord-1",
      });
    });

    it("validates bearer tokens when there is no session", async () => {
      vi.mocked(validateToken).mockResolvedValue({
        userId: "user-2",
        discordId: "discord-2",
      } as never);

      const result = await service.buildVerifiedIdentityFromRequest(
        null,
        "Bearer token-123",
      );

      expect(result).toEqual({
        userId: "user-2",
        discordId: "discord-2",
      });
    });

    it("returns null when bearer token validation fails", async () => {
      vi.mocked(validateToken).mockRejectedValue(new Error("invalid"));

      const result = await service.buildVerifiedIdentityFromRequest(
        null,
        "Bearer token-123",
      );

      expect(result).toBeNull();
    });
  });

  describe("token expiry helpers", () => {
    it("reports expired access tokens", () => {
      expect(
        service.isAccessTokenExpired(
          new Date(Date.now() - 1_000).toISOString(),
        ),
      ).toBe(true);
    });

    it("returns zero when expiry is missing", () => {
      expect(service.getExpiresInSeconds(undefined)).toBe(0);
    });
  });
});
