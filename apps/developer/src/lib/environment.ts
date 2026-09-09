export function getPortalEnvironment(hostname: string) {
  if (hostname === "developer.lootlog.pl") {
    return {
      production: true,
      auth: "https://auth.lootlog.pl",
      main: "https://api.lootlog.pl",
      activity: "https://activity.lootlog.pl",
      battlelog: "https://battlelog.lootlog.pl",
      search: "https://search.lootlog.pl",
    };
  }
  if (hostname === "dev-developer.lootlog.pl") {
    return {
      production: false,
      auth: "https://dev-auth.lootlog.pl",
      main: "https://dev-api.lootlog.pl",
      activity: "https://dev-activity.lootlog.pl",
      battlelog: "https://dev-battlelog.lootlog.pl",
      search: "https://dev-search.lootlog.pl",
    };
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return {
      production: false,
      auth: "http://localhost/api/auth",
      main: "http://localhost/api/lootlog",
      activity: "http://localhost/api/activity",
      battlelog: "http://localhost/api/battlelog",
      search: "http://localhost/api/search",
    };
  }
  throw new Error("Unsupported developer portal host");
}
