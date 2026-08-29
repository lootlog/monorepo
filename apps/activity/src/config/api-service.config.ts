import { env } from "#src/config/env";

export interface ApiServiceConfig {
  url: string;
}

export const apiServiceConfig: ApiServiceConfig = {
  url: env.API_SERVICE_URL,
};
