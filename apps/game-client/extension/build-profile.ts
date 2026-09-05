// Extension endpoints are explicit build inputs, independent of userscript .env files.
export function buildProfile(mode: string): Record<string, string> {
  if (!["production", "production-local", "development"].includes(mode))
    throw new Error(`Unsupported extension build mode: ${mode}`);
  const local = mode !== "production";
  return {
    VITE_API_URL: local
      ? "http://localhost/api/lootlog"
      : "https://api.lootlog.pl",
    VITE_AUTH_SERVICE_URL: local
      ? "http://localhost/api/auth"
      : "https://auth.lootlog.pl",
    VITE_BATTLELOG_API_URL: local
      ? "http://localhost/api/battlelog"
      : "https://battlelog.lootlog.pl",
    VITE_GATEWAY_URL: local ? "http://localhost" : "https://gateway.lootlog.pl",
    VITE_GATEWAY_SOCKET_PATH: local ? "/gateway/ws" : "/ws",
    VITE_LOOTLOG_APP_URL: local ? "http://localhost" : "https://lootlog.pl",
  };
}
