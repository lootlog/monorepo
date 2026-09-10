import type { JsonValue } from "./openapi-document.js";

// Verified against auth lifecycle PostgreSQL tests and HTTP payload/ownership checks.
const errors = {
  "400": {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: {
              type: "string",
            },
          },
          required: ["message"],
        },
      },
    },
  },
  "401": {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: {
              type: "string",
            },
          },
          required: ["message"],
        },
      },
    },
  },
  "403": {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: {
              type: "string",
            },
          },
          required: ["message"],
        },
      },
    },
  },
  "404": {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: {
              type: "string",
            },
          },
          required: ["message"],
        },
      },
    },
  },
  "409": {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: {
              type: "string",
            },
          },
          required: ["message"],
        },
      },
    },
  },
  "429": {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: {
              type: "string",
            },
          },
          required: ["message"],
        },
      },
    },
  },
  "503": {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: {
              type: "string",
            },
          },
          required: ["message"],
        },
      },
    },
  },
};

type AuthApiContracts = Record<
  | "GET /auth/api-keys"
  | "POST /auth/api-keys"
  | "PATCH /auth/api-keys/{id}"
  | "DELETE /auth/api-keys/{id}"
  | "POST /auth/internal/api-keys/status",
  JsonValue
>;

export const authApiAdditions: AuthApiContracts = {
  "GET /auth/api-keys": {
    operationId: "apiKeys.ListApiKeys",
    parameters: [],
    responses: {
      ...errors,
      "200": {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                keys: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      organizationIds: {
                        type: "array",
                        items: {
                          type: "string",
                          pattern: "^\\d{1,20}$",
                        },
                        maxItems: 100,
                      },
                      mode: {
                        type: "string",
                        enum: ["read", "read-write"],
                      },
                      personalData: {
                        type: "boolean",
                      },
                      id: {
                        type: "string",
                      },
                      name: {
                        type: "string",
                      },
                      start: {
                        nullable: true,
                        type: "string",
                      },
                      createdAt: {
                        type: "string",
                      },
                      expiresAt: {
                        nullable: true,
                        type: "string",
                      },
                    },
                    required: [
                      "organizationIds",
                      "mode",
                      "personalData",
                      "id",
                      "name",
                      "start",
                      "createdAt",
                      "expiresAt",
                    ],
                  },
                },
              },
              required: ["keys"],
            },
          },
        },
      },
    },
  },
  "POST /auth/api-keys": {
    operationId: "apiKeys.CreateApiKey",
    parameters: [],
    responses: {
      ...errors,
      "200": {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                organizationIds: {
                  type: "array",
                  items: {
                    type: "string",
                    pattern: "^\\d{1,20}$",
                  },
                  maxItems: 100,
                },
                mode: {
                  type: "string",
                  enum: ["read", "read-write"],
                },
                personalData: {
                  type: "boolean",
                },
                id: {
                  type: "string",
                },
                name: {
                  type: "string",
                },
                start: {
                  nullable: true,
                  type: "string",
                },
                createdAt: {
                  type: "string",
                },
                expiresAt: {
                  nullable: true,
                  type: "string",
                },
                key: {
                  type: "string",
                },
              },
              required: [
                "organizationIds",
                "mode",
                "personalData",
                "id",
                "name",
                "start",
                "createdAt",
                "expiresAt",
                "key",
              ],
            },
          },
        },
      },
    },
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              organizationIds: {
                type: "array",
                items: {
                  type: "string",
                  pattern: "^\\d{1,20}$",
                },
                maxItems: 100,
              },
              mode: {
                type: "string",
                enum: ["read", "read-write"],
              },
              personalData: {
                type: "boolean",
              },
              name: {
                type: "string",
              },
              expiresIn: {
                nullable: true,
                type: "number",
                enum: [2592000, 7776000, 31536000],
              },
            },
            required: [
              "organizationIds",
              "mode",
              "personalData",
              "name",
              "expiresIn",
            ],
          },
        },
      },
      required: true,
    },
  },
  "PATCH /auth/api-keys/{id}": {
    operationId: "apiKeys.RenameApiKey",
    parameters: [
      {
        name: "id",
        in: "path",
        schema: {
          type: "string",
          minLength: 1,
        },
        required: true,
      },
    ],
    responses: {
      ...errors,
      "200": {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                organizationIds: {
                  type: "array",
                  items: {
                    type: "string",
                    pattern: "^\\d{1,20}$",
                  },
                  maxItems: 100,
                },
                mode: {
                  type: "string",
                  enum: ["read", "read-write"],
                },
                personalData: {
                  type: "boolean",
                },
                id: {
                  type: "string",
                },
                name: {
                  type: "string",
                },
                start: {
                  nullable: true,
                  type: "string",
                },
                createdAt: {
                  type: "string",
                },
                expiresAt: {
                  nullable: true,
                  type: "string",
                },
              },
              required: [
                "organizationIds",
                "mode",
                "personalData",
                "id",
                "name",
                "start",
                "createdAt",
                "expiresAt",
              ],
            },
          },
        },
      },
    },
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: {
                type: "string",
              },
            },
            required: ["name"],
          },
        },
      },
      required: true,
    },
  },
  "DELETE /auth/api-keys/{id}": {
    operationId: "apiKeys.DeleteApiKey",
    parameters: [
      {
        name: "id",
        in: "path",
        schema: {
          type: "string",
          minLength: 1,
        },
        required: true,
      },
    ],
    responses: {
      ...errors,
      "200": {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: {
                  type: "boolean",
                  enum: [true],
                },
              },
              required: ["success"],
            },
          },
        },
      },
    },
  },
  "POST /auth/internal/api-keys/status": {
    operationId: "apiKeys.ApiKeyStatuses",
    parameters: [],
    responses: {
      ...errors,
      "200": {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                keys: {
                  type: "array",
                  items: {
                    anyOf: [
                      {
                        type: "object",
                        properties: {
                          keyId: {
                            type: "string",
                            minLength: 1,
                          },
                          valid: {
                            type: "boolean",
                            enum: [false],
                          },
                        },
                        required: ["keyId", "valid"],
                      },
                      {
                        type: "object",
                        properties: {
                          keyId: {
                            type: "string",
                            minLength: 1,
                          },
                          valid: {
                            type: "boolean",
                            enum: [true],
                          },
                          access: {
                            type: "object",
                            properties: {
                              organizationIds: {
                                type: "array",
                                items: {
                                  type: "string",
                                  pattern: "^\\d{1,20}$",
                                },
                                maxItems: 100,
                              },
                              mode: {
                                type: "string",
                                enum: ["read", "read-write"],
                              },
                              personalData: {
                                type: "boolean",
                              },
                              keyId: {
                                type: "string",
                                minLength: 1,
                              },
                              expiresAt: {
                                nullable: true,
                                type: "string",
                              },
                            },
                            required: [
                              "organizationIds",
                              "mode",
                              "personalData",
                              "keyId",
                              "expiresAt",
                            ],
                          },
                          userId: {
                            type: "string",
                            minLength: 1,
                          },
                          discordId: {
                            type: "string",
                            minLength: 1,
                          },
                        },
                        required: [
                          "keyId",
                          "valid",
                          "access",
                          "userId",
                          "discordId",
                        ],
                      },
                    ],
                  },
                },
              },
              required: ["keys"],
            },
          },
        },
      },
    },
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              keyIds: {
                type: "array",
                items: {
                  type: "string",
                  minLength: 1,
                },
                maxItems: 100,
              },
            },
            required: ["keyIds"],
          },
        },
      },
      required: true,
    },
  },
};
