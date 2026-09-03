import { expect, test } from "bun:test";
import { BearerSecurityMiddleware, LootlogApi } from "../lootlog-api.js";

const PUBLIC_ENDPOINTS = [
  "internal.GuildsInternalControllerGetUserPermissions",
  "internal.GuildsInternalControllerGetGuildByIdOrVanityUrl",
  "health.HealthzControllerHealthCheck",
  "maps.MapsControllerGetMaps",
  "public-guild-stats-card.PublicGuildStatsCardControllerGetStatsCard",
];

test("requires bearer authentication outside the explicit public allowlist", () => {
  const publicEndpoints: string[] = [];

  for (const group of Object.values(LootlogApi.groups)) {
    for (const endpoint of Object.values(group.endpoints)) {
      const identifier = `${group.identifier}.${endpoint.identifier}`;
      if (endpoint.middlewares.has(BearerSecurityMiddleware)) {
        continue;
      } else {
        publicEndpoints.push(identifier);
      }
    }
  }

  expect(publicEndpoints).toEqual(PUBLIC_ENDPOINTS);
});
