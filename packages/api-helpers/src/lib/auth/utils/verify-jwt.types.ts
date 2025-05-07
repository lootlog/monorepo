export type Jwks = {
  crv: string;
  kty: string;
  kid: string;
  x: string;
};
export type JwksKeys = {
  keys: Jwks[];
};

export type VerifyTokenOptions = {
  token: string;
  issuer: string;
  audience: string;
  jwksUri?: string;
  jwks?: JwksKeys;
};

export type VerifyTokenResponse = {
  discordId?: string;
  userId?: string;
};
