import { registerAs } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';

export interface Auth0Config {
  auth0IssuerUrl: string;
  auth0Audience: string;
}

export default registerAs(ConfigKey.AUTH0, (): Auth0Config => {
  const { AUTH0_AUDIENCE, AUTH0_ISSUER_URL } = process.env;

  return {
    auth0Audience: AUTH0_AUDIENCE,
    auth0IssuerUrl: AUTH0_ISSUER_URL,
  };
});
