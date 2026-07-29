// ==UserScript==
// @name       @lootlog/game-client-local
// @namespace  npm/vite-plugin-monkey
// @version    $GAME_CLIENT_VERSION$
// @author     Wildstylez & friends
// @icon       https://vitejs.dev/logo.svg
// @match      https://*.margonem.pl
// @match      https://*.margonem.com
// @match      https://*.margonem.pl/*
// @match      https://*.margonem.com/*
// @exclude    http*://margonem.*/*
// @exclude    http*://www.margonem.*/*
// @exclude    http*://new.margonem.*/*
// @exclude    http*://forum.margonem.*/*
// @exclude    http*://commons.margonem.*/*
// @exclude    http*://dev-commons.margonem.*/*
// @connect    127.0.0.1
// @grant      GM_xmlhttpRequest
// ==/UserScript==

const bundleUrl = "$GAME_CLIENT_LOCAL_BUNDLE_URL$";

(function () {
  "use strict";

  const reportFailure = (message) => {
    console.warn(`[Lootlog local] ${message}`);
  };

  GM_xmlhttpRequest({
    method: "GET",
    timeout: 10_000,
    url: `${bundleUrl}?cacheBust=${Date.now()}`,
    onerror: () => {
      reportFailure(
        `Could not load the local production bundle from ${bundleUrl}. Is dev:local-prod running?`,
      );
    },
    ontimeout: () => {
      reportFailure(
        `Timed out while loading the local bundle from ${bundleUrl}.`,
      );
    },
    onload: (response) => {
      if (response.status < 200 || response.status >= 300) {
        reportFailure(
          `Local bundle request failed with HTTP ${response.status} (${bundleUrl}).`,
        );
        return;
      }

      const bundleObjectUrl = URL.createObjectURL(
        new Blob([response.responseText], { type: "text/javascript" }),
      );
      const script = document.createElement("script");
      script.src = bundleObjectUrl;
      script.onload = () => {
        URL.revokeObjectURL(bundleObjectUrl);
        script.remove();
      };
      script.onerror = () => {
        URL.revokeObjectURL(bundleObjectUrl);
        script.remove();
        reportFailure(
          "The local bundle was downloaded but could not be executed.",
        );
      };
      (document.head ?? document.documentElement).append(script);
    },
  });
})();
