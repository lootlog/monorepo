import assert from "node:assert/strict";
import { routeRequest } from "../src/index.ts";

const origins = {
  BATTLELOG_ORIGIN: "https://battlelog.invalid",
  DOCS_ORIGIN: "https://docs.invalid",
  LANDING_ORIGIN: "https://landing.invalid",
  WEB_ORIGIN: "https://web.invalid",
};

/**
 * Fails a static build whose public paths the traffic splitter would send to
 * another upstream, so a new route or public folder cannot fall through to Web.
 */
export async function assertRoutedTo(pathnames, upstream) {
  const expectedOrigin = origins[`${upstream.toUpperCase()}_ORIGIN`];

  for (const pathname of pathnames) {
    let routedOrigin;

    // `lootlog.pl` redirects `/docs` to its own host; `dev.lootlog.pl` serves it.
    await routeRequest(
      new Request(new URL(pathname, "https://dev.lootlog.pl")),
      origins,
      (request) => {
        routedOrigin = new URL(request.url).origin;

        return Promise.resolve(new Response(null));
      },
    );

    assert.equal(
      routedOrigin,
      expectedOrigin,
      `apps/traffic-splitter does not route ${pathname} to ${upstream}`,
    );
  }
}
