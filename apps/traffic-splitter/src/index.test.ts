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

const productionEnvironment = {
  DOCS_ORIGIN: "https://lootlog-docs.example.workers.dev",
  LANDING_ORIGIN: "https://lootlog-landing.pages.dev",
  WEB_ORIGIN: "https://lootlog-web-monorepo.pages.dev",
} satisfies TrafficSplitterEnvironment;

describe("traffic splitter", () => {
  it.each([
    ["/", environment.LANDING_ORIGIN],
    ["/privacy-policy/", environment.LANDING_ORIGIN],
    ["/terms-of-service", environment.LANDING_ORIGIN],
    ["/landing-assets/app.css", environment.LANDING_ORIGIN],
    ["/brand/lootlog-mark.svg", environment.LANDING_ORIGIN],
    ["/screenshots/dashboard-current.png", environment.LANDING_ORIGIN],
    ["/favicon.ico", environment.LANDING_ORIGIN],
    ["/_next/static/legacy.css", environment.LANDING_ORIGIN],
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
    ["/landing-assets/app.css", productionEnvironment.LANDING_ORIGIN],
    ["/docs-assets/docs.js", productionEnvironment.DOCS_ORIGIN],
    ["/@me", productionEnvironment.WEB_ORIGIN],
  ])("routes production path %s to %s", async (path, expectedOrigin) => {
    const upstreamFetch = vi.fn<UpstreamFetch>((request) =>
      Promise.resolve(Response.json({ url: request.url })),
    );

    await routeRequest(
      new Request(`https://lootlog.pl${path}`),
      productionEnvironment,
      upstreamFetch,
    );

    expect(upstreamFetch.mock.calls[0]?.[0].url).toBe(
      new URL(path, expectedOrigin).href,
    );
  });

  it.each([
    ["https://dev.lootlog.pl/@me", environment.WEB_ORIGIN],
    ["https://example.com/docs", environment.WEB_ORIGIN],
    ["not a URL", environment.WEB_ORIGIN],
  ])(
    "routes a Web or untrusted legacy asset referred by %s to %s",
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

  it.each([
    {
      alias: "landing",
      pagePath: "/",
      upstreamOrigin: environment.LANDING_ORIGIN,
    },
    {
      alias: "docs",
      pagePath: "/docs/features",
      upstreamOrigin: environment.DOCS_ORIGIN,
    },
  ])(
    "preserves the $alias origin across nested legacy assets",
    async ({ alias, pagePath, upstreamOrigin }) => {
      const upstreamFetch = vi.fn<UpstreamFetch>((request) =>
        Promise.resolve(Response.json({ url: request.url })),
      );
      const assetUrl = "https://dev.lootlog.pl/assets/entry.css?theme=dark";

      const redirectResponse = await routeRequest(
        new Request(assetUrl, {
          headers: { referer: `https://dev.lootlog.pl${pagePath}` },
        }),
        environment,
        upstreamFetch,
      );
      const taggedAssetUrl = `https://dev.lootlog.pl/__legacy-assets/${alias}/assets/entry.css?theme=dark`;

      expect(redirectResponse.status).toBe(307);
      expect(redirectResponse.headers.get("location")).toBe(taggedAssetUrl);
      expect(redirectResponse.headers.get("cache-control")).toBe(
        "private, no-store",
      );
      expect(redirectResponse.headers.get("vary")).toBe("Referer");
      expect(upstreamFetch).not.toHaveBeenCalled();

      await routeRequest(
        new Request(taggedAssetUrl),
        environment,
        upstreamFetch,
      );

      expect(upstreamFetch.mock.calls[0]?.[0].url).toBe(
        `${upstreamOrigin}/assets/entry.css?theme=dark`,
      );

      const nestedResponse = await routeRequest(
        new Request("https://dev.lootlog.pl/assets/nested.woff2", {
          headers: { referer: taggedAssetUrl },
        }),
        environment,
        upstreamFetch,
      );

      expect(nestedResponse.status).toBe(307);
      expect(nestedResponse.headers.get("location")).toBe(
        `https://dev.lootlog.pl/__legacy-assets/${alias}/assets/nested.woff2`,
      );
    },
  );

  it.each([
    {
      alias: "landing",
      upstreamOrigin: environment.LANDING_ORIGIN,
    },
    {
      alias: "docs",
      upstreamOrigin: environment.DOCS_ORIGIN,
    },
  ])(
    "recovers the $alias origin from an untagged cached legacy parent",
    async ({ alias, upstreamOrigin }) => {
      const parentPath = "/assets/cached-parent.css?version=1";
      const upstreamFetch = vi.fn<UpstreamFetch>((request) => {
        const requestOrigin = new URL(request.url).origin;
        const contentType =
          request.method === "HEAD" && requestOrigin === upstreamOrigin
            ? "text/css"
            : "text/html";

        return Promise.resolve(
          new Response(null, {
            headers: { "content-type": contentType },
            status: 200,
          }),
        );
      });

      const response = await routeRequest(
        new Request("https://dev.lootlog.pl/assets/nested.woff2", {
          headers: {
            authorization: "Bearer secret",
            cookie: "session=secret",
            referer: `https://dev.lootlog.pl${parentPath}`,
          },
        }),
        environment,
        upstreamFetch,
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `https://dev.lootlog.pl/__legacy-assets/${alias}/assets/nested.woff2`,
      );
      expect(
        upstreamFetch.mock.calls.map(([request]) => ({
          method: request.method,
          url: request.url,
        })),
      ).toContainEqual({
        method: "HEAD",
        url: `${upstreamOrigin}${parentPath}`,
      });
      expect(
        upstreamFetch.mock.calls.every(
          ([request]) =>
            !request.headers.has("authorization") &&
            !request.headers.has("cookie"),
        ),
      ).toBe(true);
    },
  );

  it("keeps an untagged cached Web parent on the Web origin", async () => {
    const parentPath = "/assets/cached-web.js";
    const childPath = "/assets/web-chunk.js";
    const upstreamFetch = vi.fn<UpstreamFetch>((request) => {
      if (request.method === "HEAD") {
        if (new URL(request.url).origin === environment.DOCS_ORIGIN) {
          return Promise.reject(new Error("Docs origin unavailable"));
        }

        return Promise.resolve(
          new Response(null, {
            headers: { "content-type": "application/javascript" },
          }),
        );
      }

      return Promise.resolve(Response.json({ url: request.url }));
    });

    const response = await routeRequest(
      new Request(`https://dev.lootlog.pl${childPath}`, {
        headers: { referer: `https://dev.lootlog.pl${parentPath}` },
      }),
      environment,
      upstreamFetch,
    );

    expect(response.status).toBe(200);
    const forwardedRequests = upstreamFetch.mock.calls.map(([request]) => ({
      method: request.method,
      url: request.url,
    }));

    expect(
      forwardedRequests.filter(({ method }) => method === "HEAD"),
    ).toHaveLength(3);
    expect(forwardedRequests.at(-1)).toEqual({
      method: "GET",
      url: `${environment.WEB_ORIGIN}${childPath}`,
    });
  });

  it.each([
    "//attacker.example/collect",
    "///attacker.example/collect",
    String.raw`/\\attacker.example/collect`,
    "/%2F%2Fattacker.example/collect",
  ])("keeps the selected upstream origin for %s", async (pathname) => {
    const upstreamFetch = vi.fn<UpstreamFetch>((request) =>
      Promise.resolve(Response.json({ url: request.url })),
    );
    const incomingRequest = new Request(
      `https://dev.lootlog.pl${pathname}?source=dev`,
    );

    await routeRequest(incomingRequest, environment, upstreamFetch);

    const upstreamRequest = upstreamFetch.mock.calls[0]?.[0];
    const upstreamUrl = new URL(upstreamRequest?.url ?? "");

    expect(upstreamUrl.origin).toBe(environment.WEB_ORIGIN);
    expect(upstreamUrl.pathname).toBe(new URL(incomingRequest.url).pathname);
    expect(upstreamUrl.search).toBe("?source=dev");
  });

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
