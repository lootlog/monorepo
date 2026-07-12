import { createDiscordProviderOptions } from "./discord-provider-options";

describe("Discord identity policy", () => {
  it("selects the Discord account used for every successful sign-in", () => {
    const provider = createDiscordProviderOptions({
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectURI: "https://auth.example.com/idp/callback/discord",
      scopes: ["identify", "guilds"],
    });

    expect(provider.overrideUserInfoOnSignIn).toBe(true);
    expect(
      provider.mapProfileToUser({
        id: "new-discord-id",
        given_name: "New",
        family_name: "User",
      }),
    ).toMatchObject({
      discordId: "new-discord-id",
      firstName: "New",
      lastName: "User",
    });
  });
});
