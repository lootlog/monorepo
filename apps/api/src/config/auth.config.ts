import { env } from "src/config/env";

export interface AuthConfig {
  serviceUrl: string;
}

export const authConfig: AuthConfig = {
  serviceUrl: env.AUTH_SERVICE_URL,
};
