// ==UserScript==
// @name       lootlog-client
// @namespace  npm/vite-plugin-monkey
// @version    0.0.1
// @author     monkey
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
// @grant      GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  const script = document.createElement("script");
  script.src = `https://${
    env === "develop" ? "develop." : ""
  }lootlog-game-client.pages.dev/lootlog-client.user.js?ts=${Date.now()}`;

  document.head.appendChild(script);
})();
