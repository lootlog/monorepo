import { JwksClient } from "jwks-rsa";
import { APP_CONFIG } from "../config/app.config.js";

export const jwksClient = new JwksClient({
  jwksUri: APP_CONFIG.jwksUrl,
  timeout: 30000,
});
