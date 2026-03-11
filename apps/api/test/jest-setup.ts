import { randomUUID } from "node:crypto";

jest.mock("uuid", () => ({
  v6: () => randomUUID(),
  v4: () => randomUUID(),
  v5: jest.fn(),
  v3: jest.fn(),
  v1: jest.fn(),
  validate: jest.fn(),
  version: jest.fn(),
}));
