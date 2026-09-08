import { decodeOpenApiDocument, isJsonObject } from "./openapi-document.js";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import {
  assertVerifiedPersonalAddition,
  normalizeAllowedChanges,
  normalizeOpenApiRepresentation,
} from "./check-openapi-parity.js";

const httpErrorResponse = {
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/HttpErrorResponse" },
    },
  },
};

test("verified HTTP errors restore previous empty responses and remove only added statuses", () => {
  expect(
    normalizeAllowedChanges("api", "DELETE /users/@me", {
      responses: { "200": {}, "503": httpErrorResponse },
    }),
  ).toEqual({ responses: { "200": {}, "503": {} } });
  expect(
    normalizeAllowedChanges("api", "GET /preferences", {
      responses: {
        "200": {},
        "400": httpErrorResponse,
        "403": httpErrorResponse,
        "422": httpErrorResponse,
      },
    }),
  ).toEqual({ responses: { "200": {}, "422": httpErrorResponse } });
  expect(
    normalizeAllowedChanges("api", "GET /unrelated", {
      responses: { "400": httpErrorResponse },
    }),
  ).toEqual({ responses: { "400": httpErrorResponse } });
});

test("HTTP error exceptions reject missing statuses, altered references and media types", () => {
  const invalidResponses: Parameters<typeof normalizeAllowedChanges>[2][] = [
    { "200": {} },
    { "200": {}, "503": {} },
    {
      "200": {},
      "503": {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/OtherError" },
          },
        },
      },
    },
    {
      "200": {},
      "503": {
        content: {
          "text/plain": {
            schema: { $ref: "#/components/schemas/HttpErrorResponse" },
          },
        },
      },
    },
    {
      "200": {},
      "503": { ...httpErrorResponse, headers: { "Retry-After": {} } },
    },
  ];
  for (const responses of invalidResponses) {
    expect(() =>
      normalizeAllowedChanges("api", "DELETE /users/@me", { responses }),
    ).toThrow("must declare a 503 HttpErrorResponse");
  }
});

test.each([
  [
    "activity",
    "GET /guilds/{guildId}/activity-logs",
    "/guilds/{guildId}/activity-logs",
    "get",
    "503",
    "AuthorizationUnavailable",
  ],
  [
    "battlelog",
    "PATCH /battles/{battleId}",
    "/battles/{battleId}",
    "patch",
    "400",
    "BadRequestResponse",
  ],
] as const)(
  "%s exceptions enforce the complete generated error schema",
  (service, key, path, method, status, schemaName) => {
    const document = decodeOpenApiDocument(
      parse(
        readFileSync(
          new URL(`../../../apps/${service}/openapi.yaml`, import.meta.url),
          "utf8",
        ),
      ),
    );
    const operation = document.paths?.[path]?.[method];
    expect(operation).toBeDefined();
    if (!isJsonObject(operation) || !isJsonObject(operation.responses))
      throw new Error("Missing test operation responses");
    const operationResponses = operation.responses;
    expect(normalizeAllowedChanges(service, key, operation)).not.toHaveProperty(
      `responses.${status}`,
    );
    expect(() =>
      normalizeAllowedChanges(service, key, {
        ...operation,
        responses: { ...operationResponses, [status]: {} },
      }),
    ).toThrow(`must declare a ${status} ${schemaName}`);
    const responses = { ...operationResponses };
    delete responses[status];
    expect(() =>
      normalizeAllowedChanges(service, key, { ...operation, responses }),
    ).toThrow(`must declare a ${status} ${schemaName}`);
    // Removing the migrated status must not conceal loss of the existing 404.
    if (service === "battlelog")
      expect(normalizeAllowedChanges(service, key, operation)).toHaveProperty(
        "responses.404",
      );
  },
);

test("enum order is immaterial but allowed values must remain identical", () => {
  const normalize = (values: string[]) =>
    normalizeOpenApiRepresentation({ schema: { enum: values } });
  expect(normalize(["TITAN", "COLOSSUS"])).toEqual(
    normalize(["COLOSSUS", "TITAN"]),
  );
  expect(normalize(["TITAN", "COLOSSUS"])).not.toEqual(
    normalize(["TITAN", "HERO"]),
  );
  expect(normalize(["TITAN", "COLOSSUS"])).not.toEqual(normalize(["TITAN"]));
});

test("Organization 404 exceptions require the declared response", () => {
  const operation = "GET /guilds/{guildId}/members/summary";
  expect(() =>
    normalizeAllowedChanges("api", operation, { responses: { "200": {} } }),
  ).toThrow("must declare a 404 response");
  expect(
    normalizeAllowedChanges("api", operation, {
      responses: { "200": {}, "404": { description: "Not Found" } },
    }),
  ).toEqual({ responses: { "200": {} } });
});

test("reservation exceptions retain only the verified statuses and error schema", () => {
  const operation = "GET /users/@me/reservations";
  const errorResponse = {
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/OrganizationWorkspaceErrorResponse",
        },
      },
    },
  };
  expect(
    normalizeAllowedChanges("api", operation, {
      responses: { "200": {}, "401": errorResponse },
    }),
  ).toEqual({ responses: { "200": {} } });
  const invalidResponses: Parameters<typeof normalizeAllowedChanges>[2][] = [
    {},
    {
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/OtherError" },
        },
      },
    },
    { ...errorResponse, headers: { "Retry-After": {} } },
  ];
  for (const response of invalidResponses) {
    expect(() =>
      normalizeAllowedChanges("api", operation, {
        responses: { "200": {}, "401": response },
      }),
    ).toThrow("must declare a 401 OrganizationWorkspaceErrorResponse");
  }
  expect(() =>
    normalizeAllowedChanges("api", operation, { responses: { "200": {} } }),
  ).toThrow("must declare a 401 OrganizationWorkspaceErrorResponse");
  expect(
    normalizeAllowedChanges("api", operation, {
      responses: { "200": {}, "401": errorResponse, "422": errorResponse },
    }),
  ).toEqual({ responses: { "200": {}, "422": errorResponse } });
  expect(
    normalizeAllowedChanges("api", "GET /unrelated", {
      responses: { "401": errorResponse },
    }),
  ).toEqual({ responses: { "401": errorResponse } });
  expect(
    normalizeAllowedChanges("auth", operation, {
      responses: { "401": errorResponse },
    }),
  ).toEqual({ responses: { "401": errorResponse } });
});

test.each([
  ["activity", "/users/@me/activity/online"],
  ["api", "/users/@me/stats/kills/analytics"],
  ["api", "/users/@me/stats/kills/activity"],
  ["api", "/users/@me/feed"],
  ["api", "/guilds/{guildId}/group-fights"],
  ["api", "/guilds/{guildId}/group-fights/ranking"],
  ["api", "/guilds/{guildId}/group-fights/{fightId}"],
] as const)(
  "verified private addition %s %s pins authentication, filters and response",
  (service, path) => {
    const document = parse(
      readFileSync(
        new URL(`../../../apps/${service}/openapi.yaml`, import.meta.url),
        "utf8",
      ),
    );
    const operation = document.paths[path].get;
    const key = `GET ${path}`;
    expect(() =>
      assertVerifiedPersonalAddition(service, key, operation),
    ).not.toThrow();
    expect(() =>
      assertVerifiedPersonalAddition(service, key, {
        ...operation,
        security: [],
      }),
    ).toThrow("contract changed");
    expect(() =>
      assertVerifiedPersonalAddition(service, key, {
        ...operation,
        parameters: [
          ...operation.parameters,
          {
            name: "userId",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
        ],
      }),
    ).toThrow("contract changed");
    expect(() =>
      assertVerifiedPersonalAddition(service, key, {
        ...operation,
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Other" },
              },
            },
          },
        },
      }),
    ).toThrow("contract changed");
    expect(() =>
      assertVerifiedPersonalAddition(service, `${key}/unreviewed`, operation),
    ).toThrow("Unverified");
  },
);

test("manageable guild migration pins the Discord summary response and preserves unrelated contracts", () => {
  const document = parse(
    readFileSync(
      new URL("../../../apps/api/openapi.yaml", import.meta.url),
      "utf8",
    ),
  );
  const key = "GET /guilds/@me/manageable";
  const operation = document.paths["/guilds/@me/manageable"].get;
  const schemas = document.components.schemas;
  const normalized = normalizeAllowedChanges("api", key, operation, schemas);
  expect(normalized).toHaveProperty(
    "responses.200.content.application/json.schema.items.$ref",
    "#/components/schemas/GuildResponseDto",
  );
  expect(normalized).toHaveProperty("security", [{ bearer: [] }]);
  expect(() => normalizeAllowedChanges("api", key, operation)).toThrow(
    "contract changed",
  );
  for (const schema of [
    {
      ...schemas.ManageableOrganizationResponse,
      required: ["id", "name", "icon"],
    },
    {
      ...schemas.ManageableOrganizationResponse,
      properties: { id: { type: "string" } },
    },
  ]) {
    expect(() =>
      normalizeAllowedChanges("api", key, operation, {
        ...schemas,
        ManageableOrganizationResponse: schema,
      }),
    ).toThrow("contract changed");
  }
  for (const responses of [
    {},
    { "200": { content: { "text/plain": { schema: { type: "string" } } } } },
    {
      "200": {
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: { $ref: "#/components/schemas/GuildResponseDto" },
            },
          },
        },
      },
    },
  ]) {
    expect(() =>
      normalizeAllowedChanges("api", key, { ...operation, responses }, schemas),
    ).toThrow("must declare a 200 ManageableOrganizationResponse");
  }
  expect(
    normalizeAllowedChanges(
      "api",
      key,
      {
        ...operation,
        responses: { ...operation.responses, "418": {} },
      },
      schemas,
    ),
  ).toHaveProperty("responses.418");
  expect(
    normalizeAllowedChanges("api", "GET /unrelated", operation, schemas),
  ).toEqual(normalizeOpenApiRepresentation(operation));
});

test("group fight ingestion pins its authenticated request and acceptance status", () => {
  const document = parse(
    readFileSync(
      new URL("../../../apps/api/openapi.yaml", import.meta.url),
      "utf8",
    ),
  );
  const operation = document.paths["/group-fights"].post;
  expect(() =>
    assertVerifiedPersonalAddition("api", "POST /group-fights", operation),
  ).not.toThrow();
  for (const mutation of [
    { security: [] },
    { requestBody: {} },
    { responses: { "200": operation.responses["201"] } },
  ]) {
    expect(() =>
      assertVerifiedPersonalAddition("api", "POST /group-fights", {
        ...operation,
        ...mutation,
      }),
    ).toThrow("contract changed");
  }
});
