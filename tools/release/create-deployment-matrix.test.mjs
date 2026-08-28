import assert from "node:assert/strict";
import test from "node:test";

import { createReleasePlan } from "./create-deployment-matrix.mjs";

test("maps published applications to Docker and Cloudflare release targets", () => {
  const publishedPackages = [
    { name: "@lootlog/api", version: "1.2.3" },
    { name: "@lootlog/ui", version: "2.0.0" },
    { name: "@lootlog/web", version: "1.4.0" },
    { name: "@lootlog/wiki", version: "0.2.0" },
  ];

  assert.deepEqual(createReleasePlan(publishedPackages), {
    cloudflare: [
      {
        artifactPath: "apps/web/dist",
        kind: "pages",
        packageName: "@lootlog/web",
        project: "lootlog-web-monorepo",
        version: "1.4.0",
      },
      {
        artifactPath: "apps/wiki/dist",
        configPath: "apps/wiki/wrangler.jsonc",
        kind: "worker",
        packageName: "@lootlog/wiki",
        project: "lootlog-wiki",
        version: "0.2.0",
      },
    ],
    docker: [
      {
        image: "kamilwronka7/lootlog-api",
        packageName: "@lootlog/api",
        service: "api",
        version: "1.2.3",
      },
    ],
  });
});

test("supports all eight deployable applications", () => {
  const services = [
    "activity",
    "api",
    "auth",
    "battlelog-service",
    "developer",
    "discord-bot",
    "gateway",
    "search",
  ];
  const publishedPackages = services.map((service) => ({
    name: `@lootlog/${service}`,
    version: "1.0.0",
  }));

  assert.deepEqual(
    createReleasePlan(publishedPackages).docker.map(({ service }) => service),
    services,
  );
});

test("supports all six Cloudflare applications", () => {
  const publishedPackages = [
    { name: "@lootlog/landing", version: "1.0.0" },
    { name: "@lootlog/web", version: "1.0.0" },
    { name: "@lootlog/game-client", version: "1.0.0" },
    { name: "@lootlog/docs", version: "1.0.0" },
    { name: "@lootlog/wiki", version: "1.0.0" },
    { name: "@lootlog/traffic-splitter", version: "1.0.0" },
  ];

  const cloudflarePlan = createReleasePlan(publishedPackages).cloudflare;

  assert.deepEqual(
    cloudflarePlan.map(({ artifactPath, kind, packageName, project }) => ({
      artifactPath,
      kind,
      packageName,
      project,
    })),
    [
      {
        artifactPath: "apps/traffic-splitter/dist",
        kind: "worker",
        packageName: "@lootlog/traffic-splitter",
        project: "lootlog-route-splitter",
      },
      {
        artifactPath: "apps/landing/dist/client",
        kind: "pages",
        packageName: "@lootlog/landing",
        project: "lootlog-landing",
      },
      {
        artifactPath: "apps/web/dist",
        kind: "pages",
        packageName: "@lootlog/web",
        project: "lootlog-web-monorepo",
      },
      {
        artifactPath: "apps/game-client/dist/@lootlog",
        kind: "pages",
        packageName: "@lootlog/game-client",
        project: "lootlog-game-client-monorepo",
      },
      {
        artifactPath: "apps/docs/dist/client",
        kind: "worker",
        packageName: "@lootlog/docs",
        project: "lootlog-docs",
      },
      {
        artifactPath: "apps/wiki/dist",
        kind: "worker",
        packageName: "@lootlog/wiki",
        project: "lootlog-wiki",
      },
    ],
  );
  assert.equal(
    cloudflarePlan[0].configPath,
    "apps/traffic-splitter/wrangler.jsonc",
  );
});

test("rejects malformed package versions", () => {
  assert.throws(
    () => createReleasePlan([{ name: "@lootlog/api", version: "latest" }]),
    /Invalid semantic version/,
  );
});

test("rejects duplicate deployable packages", () => {
  assert.throws(
    () =>
      createReleasePlan([
        { name: "@lootlog/api", version: "1.0.0" },
        { name: "@lootlog/api", version: "1.0.1" },
      ]),
    /Duplicate published package/,
  );
});
