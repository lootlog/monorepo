import { vi } from "vitest";

export const authFetch = vi.fn<typeof globalThis.fetch>();

vi.stubGlobal("fetch", authFetch);
