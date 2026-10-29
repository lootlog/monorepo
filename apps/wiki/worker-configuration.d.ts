declare namespace Cloudflare {
  interface Env {
    VITE_API_URL: string;
    VITE_AUTH_SERVICE_URL: string;
    VITE_SEARCH_API_URL: string;
    VITE_WEB_APP_URL: string;
  }
}

interface Env extends Cloudflare.Env {}
