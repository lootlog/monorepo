export const clientServices = {
  activity: {
    mutatorName: "activityFetch",
    specPath: "../../apps/activity/openapi.yaml",
  },
  auth: {
    mutatorName: "authFetch",
    specPath: "../../apps/auth/openapi.yaml",
  },
  battlelog: {
    mutatorName: "battlelogFetch",
    specPath: "../../apps/battlelog/openapi.yaml",
  },
  catalog: {
    mutatorName: "catalogFetch",
    specPath: "../../apps/catalog/openapi.yaml",
  },
  main: {
    mutatorName: "mainFetch",
    specPath: "../../apps/api/openapi.yaml",
  },
  search: {
    mutatorName: "searchFetch",
    specPath: "../../apps/search/openapi.yaml",
  },
} as const;
