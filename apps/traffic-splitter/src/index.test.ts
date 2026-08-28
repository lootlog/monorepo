import { describe, expect, it, vi } from "vitest";
import {
  routeRequest,
  type TrafficSplitterEnvironment,
  type UpstreamFetch,
} from "./index";

const environment = {
  DOCS_ORIGIN: "https://lootlog-docs-develop.example.workers.dev",
  LANDING_ORIGIN: "https://develop.lootlog-landing.pages.dev",
  WEB_ORIGIN: "https://develop.lootlog-web-monorepo.pages.dev",
} satisfies TrafficSplitterEnvironment;

describe("development traffic splitter", () => {
  it.each([
    ["/", environment.LANDING_ORIGIN],
    ["/privacy-policy/", environment.LANDING_ORIGIN],
    ["/terms-of-service", environment.LANDING_ORIGIN],
    ["/landing-assets/app.css", environment.LANDING_ORIGIN],
    ["/brand/lootlog-mark.svg", environment.LANDING_ORIGIN],
    ["/screenshots/dashboard-current.png", environment.LANDING_ORIGIN],
    ["/favicon.ico", environment.LANDING_ORIGIN],
    ["/docs", environment.DOCS_ORIGIN],
    ["/docs/getting-started/", environment.DOCS_ORIGIN],
    ["/docs-assets/docs.js", environment.DOCS_ORIGIN],
    ["/__tsr/staticServerFnCache/page.json", environment.DOCS_ORIGIN],
    ["/api/search?query=loot", environment.DOCS_ORIGIN],
    ["/@me", environment.WEB_ORIGIN],
    ["/assets/web.js", environment.WEB_ORIGIN],
  ])("routes %s to %s", async (path, expectedOrigin) => {
    const upstreamFetch = vi.fn<UpstreamFetch>((request) =>
      Promise.resolve(Response.json({ url: request.url })),
    );

    await routeRequest(
      new Request(`https://dev.lootlog.pl${path}`),
      environment,
      upstreamFetch,
    );

    expect(upstreamFetch.mock.calls[0]?.[0].url).toBe(
      new URL(path, expectedOrigin).href,
    );
  });

  it.each([
    ["https://dev.lootlog.pl/", environment.LANDING_ORIGIN],
    ["https://dev.lootlog.pl/privacy-policy", environment.LANDING_ORIGIN],
    ["https://dev.lootlog.pl/docs/features", environment.DOCS_ORIGIN],
    ["https://dev.lootlog.pl/@me", environment.WEB_ORIGIN],
    ["https://example.com/docs", environment.WEB_ORIGIN],
  ])(
    "routes a legacy asset referred by %s to %s",
    async (referer, expectedOrigin) => {
      const upstreamFetch = vi.fn<UpstreamFetch>((request) =>
        Promise.resolve(Response.json({ url: request.url })),
      );
      const request = new Request("https://dev.lootlog.pl/assets/legacy.js", {
        headers: { referer },
      });

      await routeRequest(request, environment, upstreamFetch);

      expect(upstreamFetch.mock.calls[0]?.[0].url).toBe(
        `${expectedOrigin}/assets/legacy.js`,
      );
    },
  );

  it("preserves request semantics without forwarding credentials", async () => {
    const upstreamResponse = new Response("upstream", {
      headers: { "x-upstream": "web" },
      status: 202,
    });
    const upstreamFetch = vi.fn<UpstreamFetch>(() =>
      Promise.resolve(upstreamResponse),
    );
    const request = new Request(
      "https://dev.lootlog.pl/@me?returnTo=%2Fsettings",
      {
        body: "payload",
        headers: {
          authorization: "Bearer secret",
          cookie: "session=secret",
          "x-request-id": "request-1",
        },
        method: "POST",
      },
    );

    const response = await routeRequest(request, environment, upstreamFetch);
    const upstreamRequest = upstreamFetch.mock.calls[0]?.[0];

    expect(response).toBe(upstreamResponse);
    expect(upstreamRequest?.url).toBe(
      `${environment.WEB_ORIGIN}/@me?returnTo=%2Fsettings`,
    );
    expect(upstreamRequest?.method).toBe("POST");
    expect(await upstreamRequest?.text()).toBe("payload");
    expect(upstreamRequest?.headers.get("x-request-id")).toBe("request-1");
    expect(upstreamRequest?.headers.has("authorization")).toBe(false);
    expect(upstreamRequest?.headers.has("cookie")).toBe(false);
  });
});
