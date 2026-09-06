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
    const document = parse(
      readFileSync(
        new URL(`../../../apps/${service}/openapi.yaml`, import.meta.url),
        "utf8",
      ),
    ) as {
      paths: Record<
        string,
        Record<
          string,
          {
            responses: Record<
              string,
              Parameters<typeof normalizeAllowedChanges>[2]
            >;
          }
        >
      >;
    };
    const operation = document.paths[path]?.[method];
    expect(operation).toBeDefined();
    if (!operation) throw new Error("Missing test operation");
    expect(normalizeAllowedChanges(service, key, operation)).not.toHaveProperty(
      `responses.${status}`,
    );
    expect(() =>
      normalizeAllowedChanges(service, key, {
        ...operation,
        responses: { ...operation.responses, [status]: {} },
      }),
    ).toThrow(`must declare a ${status} ${schemaName}`);
    const responses = { ...operation.responses };
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

test("verified private additions pin authentication, supported filters and response contracts", () => {
  const cases = [
    ["activity", "/users/@me/activity/online"],
    ["api", "/users/@me/stats/kills/analytics"],
    ["api", "/users/@me/stats/kills/activity"],
    ["api", "/users/@me/feed"],
  ] as const;
  for (const [service, path] of cases) {
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
  }
});
