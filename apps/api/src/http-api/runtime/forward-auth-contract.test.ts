import { expect, test } from "bun:test";
import {
  BearerSecurityMiddleware,
  LootlogApi,
} from "../lootlog-api.generated.js";

const PUBLIC_ENDPOINTS = [
  "internal.GuildsInternalControllerGetUserPermissions",
  "internal.GuildsInternalControllerGetGuildByIdOrVanityUrl",
  "health.HealthzControllerHealthCheck",
  "maps.MapsControllerGetMaps",
  "public-guild-stats-card.PublicGuildStatsCardControllerGetStatsCard",
];

test("keeps bearer metadata on exactly the legacy protected operations", () => {
  const protectedEndpoints: string[] = [];
  const publicEndpoints: string[] = [];

  for (const group of Object.values(LootlogApi.groups)) {
    for (const endpoint of Object.values(group.endpoints)) {
      const identifier = `${group.identifier}.${endpoint.identifier}`;
      if (endpoint.middlewares.has(BearerSecurityMiddleware)) {
        protectedEndpoints.push(identifier);
      } else {
        publicEndpoints.push(identifier);
      }
    }
  }

  expect(protectedEndpoints).toHaveLength(194);
  expect(publicEndpoints).toEqual(PUBLIC_ENDPOINTS);
});
