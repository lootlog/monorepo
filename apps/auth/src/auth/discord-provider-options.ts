type DiscordProviderCredentials = {
  clientId: string;
  clientSecret: string;
  redirectURI: string;
  scopes: readonly string[];
};

type DiscordProfile = {
  id: string;
  given_name?: string;
  family_name?: string;
};

export const createDiscordProviderOptions = ({
  clientId,
  clientSecret,
  redirectURI,
  scopes,
}: DiscordProviderCredentials) => ({
  clientId,
  clientSecret,
  redirectURI,
  prompt: "consent" as const,
  scopes: [...scopes],
  overrideUserInfoOnSignIn: true,
  mapProfileToUser: (profile: DiscordProfile) => ({
    firstName: profile.given_name,
    lastName: profile.family_name,
    discordId: profile.id,
  }),
});
