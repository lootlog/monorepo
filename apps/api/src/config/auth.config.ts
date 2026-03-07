import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  serviceUrl: string;
  internalUrl: string;
  jwksUri: string;
}

export default registerAs('auth', (): AuthConfig => {
  const { AUTH_SERVICE_URL, AUTH_INTERNAL_URL, AUTH_JWKS_URI } = process.env;

  return {
    serviceUrl: AUTH_SERVICE_URL,
    internalUrl: AUTH_INTERNAL_URL,
    jwksUri: AUTH_JWKS_URI,
  };
});
