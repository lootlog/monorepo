declare namespace Cloudflare {
  interface Env {
    VITE_API_URL: string;
    VITE_AUTH_SERVICE_URL: string;
    CATALOG_API_URL: string;
    /** A secret: `wrangler secret put CATALOG_SERVICE_TOKEN`. */
    CATALOG_SERVICE_TOKEN: string;
    VITE_WEB_APP_URL: string;
  }
}

interface Env extends Cloudflare.Env {}
