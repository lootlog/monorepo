import assert from "node:assert/strict";
import test from "node:test";

import { createDeploymentMatrix } from "./create-deployment-matrix.mjs";

test("keeps only deployable applications and maps their release metadata", () => {
  const publishedPackages = [
    { name: "@lootlog/api", version: "1.2.3" },
    { name: "@lootlog/ui", version: "2.0.0" },
    { name: "@lootlog/developer", version: "0.0.1" },
  ];

  assert.deepEqual(createDeploymentMatrix(publishedPackages), [
    {
      image: "kamilwronka7/lootlog-api",
      packageName: "@lootlog/api",
      service: "api",
      version: "1.2.3",
    },
    {
      image: "kamilwronka7/lootlog-developer",
      packageName: "@lootlog/developer",
      service: "developer",
      version: "0.0.1",
    },
  ]);
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
    createDeploymentMatrix(publishedPackages).map(({ service }) => service),
    services,
  );
});

test("rejects malformed package versions", () => {
  assert.throws(
    () => createDeploymentMatrix([{ name: "@lootlog/api", version: "latest" }]),
    /Invalid semantic version/,
  );
});

test("rejects duplicate deployable packages", () => {
  assert.throws(
    () =>
      createDeploymentMatrix([
        { name: "@lootlog/api", version: "1.0.0" },
        { name: "@lootlog/api", version: "1.0.1" },
      ]),
    /Duplicate published package/,
  );
});
