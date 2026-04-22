import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { validateToken } from "@lootlog/api-helpers";
import { APIError } from "better-auth/api";
import { AuthService } from "./auth.service";
import { idpTokenRequestSchema } from "./dto/idp-token-request.dto";
import { auth } from "./better-auth";

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
      getSession: vi.fn<() => Promise<unknown>>(),
      getAccessToken: vi.fn<() => Promise<unknown>>(),
    },
  },
}));

vi.mock("src/config/env", () => ({
  env: {
    APP_URL: "http://localhost:3000",
  },
}));

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    vi.clearAllMocks();
  });

  describe("idpTokenRequestSchema", () => {
    it("accepts a valid payload", () => {
      expect(
        idpTokenRequestSchema.parse({
          userId: "user-1",
          discordId: "discord-1",
        }),
      ).toEqual({
        userId: "user-1",
        discordId: "discord-1",
      });
    });

    it("rejects unknown properties", () => {
      expect(() =>
        idpTokenRequestSchema.parse({
          userId: "user-1",
          discordId: "discord-1",
          role: "admin",
        }),
      ).toThrow("Unrecognized key");
    });
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

  describe("verifyRequestIdentity", () => {
    it("rejects spoofed auth headers", async () => {
      await expect(
        service.verifyRequestIdentity({
          headers: {},
          authDiscordId: "discord-1",
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("returns the verified identity when session is valid", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        session: {} as never,
        user: {
          id: "user-1",
          discordId: "discord-1",
        } as never,
      });

      await expect(
        service.verifyRequestIdentity({
          headers: {},
        }),
      ).resolves.toEqual({
        userId: "user-1",
        discordId: "discord-1",
      });
    });
  });

  describe("getCurrentUserScopes", () => {
    it("returns normalized scopes for the current session", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        session: {} as never,
        user: {
          id: "user-1",
          discordId: "discord-1",
        } as never,
      });
      vi.mocked(auth.api.getAccessToken).mockResolvedValue({
        accessToken: "token-123",
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        scopes: "guilds identify",
      } as never);

      await expect(service.getCurrentUserScopes({})).resolves.toEqual([
        "guilds",
        "identify",
      ]);
    });

    it("rejects when there is no current session", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      await expect(service.getCurrentUserScopes({})).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("maps missing discord tokens to a bad request", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        session: {} as never,
        user: {
          id: "user-1",
          discordId: "discord-1",
        } as never,
      });
      vi.mocked(auth.api.getAccessToken).mockResolvedValue(null as never);

      await expect(service.getCurrentUserScopes({})).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof BadRequestException &&
          JSON.stringify(error.getResponse()) ===
            JSON.stringify({ error: "Failed to retrieve IDP token" }),
      );
    });

    it("maps unexpected failures to an internal server error", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        session: {} as never,
        user: {
          id: "user-1",
          discordId: "discord-1",
        } as never,
      });
      vi.mocked(auth.api.getAccessToken).mockRejectedValue(new Error("boom"));

      await expect(service.getCurrentUserScopes({})).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof InternalServerErrorException &&
          JSON.stringify(error.getResponse()) ===
            JSON.stringify({ error: "Failed to retrieve IDP token" }),
      );
    });
  });

  describe("getIdpTokenResponse", () => {
    it("returns the token payload for a known account", async () => {
      vi.mocked(auth.api.getAccessToken).mockResolvedValue({
        accessToken: "token-123",
        accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        scopes: ["guilds", "identify"],
      } as never);

      await expect(
        service.getIdpTokenResponse({
          userId: "user-1",
          discordId: "discord-1",
        }),
      ).resolves.toMatchObject({
        accessToken: "token-123",
        scopes: ["guilds", "identify"],
      });
    });

    it("returns TOKEN_EXPIRED for expired tokens", async () => {
      vi.mocked(auth.api.getAccessToken).mockResolvedValue({
        accessToken: "token-123",
        accessTokenExpiresAt: new Date(Date.now() - 60_000).toISOString(),
        scopes: ["guilds"],
      } as never);

      await expect(
        service.getIdpTokenResponse({
          userId: "user-1",
          discordId: "discord-1",
        }),
      ).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof UnauthorizedException &&
          JSON.stringify(error.getResponse()) ===
            JSON.stringify({ error: "TOKEN_EXPIRED" }),
      );
    });

    it("maps Better Auth API errors to account-not-found responses", async () => {
      vi.mocked(auth.api.getAccessToken).mockRejectedValue(
        new APIError("BAD_REQUEST", {
          message: "account not found",
        }),
      );

      await expect(
        service.getIdpTokenResponse({
          userId: "user-1",
          discordId: "discord-1",
        }),
      ).rejects.toSatisfy((error: unknown) => {
        return (
          error instanceof HttpException &&
          error.getStatus() === 400 &&
          JSON.stringify(error.getResponse()) ===
            JSON.stringify({ error: "ACCOUNT_NOT_FOUND" })
        );
      });
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
