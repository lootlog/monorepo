declare namespace Cloudflare {
  interface Env {
    VITE_SEARCH_API_URL: string;
  }
}

interface Env extends Cloudflare.Env {}
