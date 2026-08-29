import { env } from "#src/config/env";

export interface ApiConfig {
  url: string;
}

export const apiConfig: ApiConfig = {
  url: env.API_URL,
};
