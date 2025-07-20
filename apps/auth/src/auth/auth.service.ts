import { auth } from "../lib/auth.js";

export class AuthService {
  constructor() {
    // Initialize any dependencies here
  }

  async getIdpToken(
    userId: string
  ): Promise<ReturnType<typeof auth.api.getAccessToken>> {
    const token = await auth.api.getAccessToken({
      body: {
        providerId: "discord",
        userId: userId,
      },
    });

    return token;
  }
}
