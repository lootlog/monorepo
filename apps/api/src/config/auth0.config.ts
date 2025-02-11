import { registerAs } from '@nestjs/config';

export interface Auth0Config {
  auth0ClientId: string;
  auth0ClientSecret: string;
  auth0Domain: string;
  auth0IssuerUrl: string;
  auth0Audience: string;
}

export const AUTH0_USER_ID_PREFIX = 'oauth2|Discord|';

export default registerAs('auth0', (): Auth0Config => {
  const {
    AUTH0_CLIENT_ID,
    AUTH0_CLIENT_SECRET,
    AUTH0_DOMAIN,
    AUTH0_AUDIENCE,
    AUTH0_ISSUER_URL,
  } = process.env;

  return {
    auth0ClientId: AUTH0_CLIENT_ID,
    auth0ClientSecret: AUTH0_CLIENT_SECRET,
    auth0Domain: AUTH0_DOMAIN,
    auth0Audience: AUTH0_AUDIENCE,
    auth0IssuerUrl: AUTH0_ISSUER_URL,
  };
});
