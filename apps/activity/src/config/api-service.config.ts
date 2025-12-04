import { registerAs } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';

export interface ApiServiceConfig {
  url: string;
}

export default registerAs(ConfigKey.API_SERVICE, (): ApiServiceConfig => {
  const { API_SERVICE_URL } = process.env;

  return {
    url: API_SERVICE_URL,
  };
});
