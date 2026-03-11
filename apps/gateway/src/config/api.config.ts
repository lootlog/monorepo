import { registerAs } from "@nestjs/config";
import { ConfigKey } from "src/config/config-key.enum";

export interface ApiConfig {
  url: string;
}

export default registerAs(ConfigKey.API, (): ApiConfig => {
  const { API_URL } = process.env;

  return {
    url: API_URL,
  };
});
