import { auth } from "../lib/auth.js";

export class AuthService {
  constructor() {
    // Initialize any dependencies here
  }

  async getIdpToken(
    userId: string
  ): Promise<ReturnType<typeof auth.api.getAccessToken> | { error: string }> {
    try {
      const token = await auth.api.getAccessToken({
        body: {
          providerId: "discord",
          userId: userId,
        },
      });

      if (!token || !token.accessToken) {
        return { error: "TOKEN_NOT_FOUND" };
      }

      return token;
    } catch (error) {
      console.error(`Failed to get IDP token for user ${userId}:`, error);
      return { error: "TOKEN_FETCH_FAILED" };
    }
  }
}
