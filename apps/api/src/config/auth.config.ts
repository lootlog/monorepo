import { registerAs } from "@nestjs/config";

export interface AuthConfig {
  serviceUrl: string;
}

export default registerAs("auth", (): AuthConfig => {
  const { AUTH_SERVICE_URL } = process.env;

  return {
    serviceUrl: AUTH_SERVICE_URL,
  };
});
