import { registerAs } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';

export interface AuthConfig {
  authIssuer: string;
  authAudience: string;
}

export default registerAs(ConfigKey.AUTH, (): AuthConfig => {
  const { AUTH_AUDIENCE, AUTH_ISSUER } = process.env;

  return {
    authAudience: AUTH_AUDIENCE,
    authIssuer: AUTH_ISSUER,
  };
});
