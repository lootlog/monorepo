import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "#test/bun-test";
import {
  getHealthzControllerHealthCheckQueryOptions,
  getHealthzControllerHealthCheckQueryKey,
  healthzControllerHealthCheck,
} from "./generated/main";

type TestFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

describe("generated API clients", () => {
  it("executes a core client without browser globals", async () => {
    const fetchImplementation = vi.fn<TestFetch>().mockResolvedValue(
      new Response("null", {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      }),
    );

    await healthzControllerHealthCheck({
      apiClient: {
        baseUrl: "https://core.example.test/api",
        fetch: fetchImplementation,
      },
    });

    expect(fetchImplementation).toHaveBeenCalledWith(
      new URL("https://core.example.test/api/healthz"),
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("builds executable React Query options with an isolated request override", async () => {
    const fetchImplementation = vi.fn<TestFetch>().mockResolvedValue(
      new Response("null", {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const queryOptions = getHealthzControllerHealthCheckQueryOptions({
      request: {
        apiClient: {
          baseUrl: "https://wiki-request.example.test",
          fetch: fetchImplementation,
        },
      },
    });

    await queryClient.fetchQuery(queryOptions);

    expect(Array.from(queryOptions.queryKey)).toEqual(
      Array.from(getHealthzControllerHealthCheckQueryKey()),
    );
    expect(fetchImplementation).toHaveBeenCalledWith(
      new URL("https://wiki-request.example.test/healthz"),
      expect.objectContaining({
        method: "GET",
      }),
    );
  });
});
