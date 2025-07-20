const url = "$GAME_CLIENT_URL$";
const version = "$GAME_CLIENT_VERSION$";

// ==UserScript==
// @name       @lootlog/game-client
// @namespace  npm/vite-plugin-monkey
// @version    1.0.1
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
// @grant      GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  const script = document.createElement("script");
  script.src = `${url}?v=${version}`;

  document.head.appendChild(script);
})();
