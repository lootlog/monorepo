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
// @run-at     document-start
// ==/UserScript==

(function () {
  "use strict";

  const earlyEventBuffer = [];
  window.__lootlog_early_events = earlyEventBuffer;

  function getEarlyEventBuffer() {
    return Array.isArray(window.__lootlog_early_events)
      ? window.__lootlog_early_events
      : null;
  }

  function wrapSuccessData(original) {
    if (!original || original.__lootlog_wrapped) return original;

    const base = original.__lootlog_original || original;
    const wrapped = new Proxy(base, {
      apply: function (target, thisArg, args) {
        const buffer = getEarlyEventBuffer();
        if (buffer) {
          buffer.push(args[0]);
        }
        return target.apply(thisArg, args);
      },
    });
    wrapped.__lootlog_wrapped = true;
    wrapped.__lootlog_original = base;
    return wrapped;
  }

  function trapSuccessDataProperty(container) {
    let currentValue = wrapSuccessData(container.successData);
    Object.defineProperty(container, "successData", {
      configurable: true,
      enumerable: true,
      get: function () {
        return currentValue;
      },
      set: function (fn) {
        currentValue = wrapSuccessData(fn);
      },
    });
  }

  function trapCommunication(engine) {
    if (engine.communication) {
      trapSuccessDataProperty(engine.communication);
      return;
    }

    let commValue = engine.communication;
    Object.defineProperty(engine, "communication", {
      configurable: true,
      enumerable: true,
      get: function () {
        return commValue;
      },
      set: function (val) {
        commValue = val;
        if (val && typeof val === "object") {
          trapSuccessDataProperty(val);
        }
      },
    });
  }

  // Trap window.successData (SI interface)
  trapSuccessDataProperty(window);

  // Trap window.Engine → Engine.communication → communication.successData (NI interface)
  let engineValue = window.Engine;
  Object.defineProperty(window, "Engine", {
    configurable: true,
    enumerable: true,
    get: function () {
      return engineValue;
    },
    set: function (val) {
      engineValue = val;
      if (val && typeof val === "object") {
        trapCommunication(val);
      }
    },
  });

  // If Engine already exists at this point (unlikely at document-start, but safe)
  if (engineValue && typeof engineValue === "object") {
    trapCommunication(engineValue);
  }

  function injectMainBundle() {
    const script = document.createElement("script");
    script.src = url + "?v=" + version;
    document.head.appendChild(script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectMainBundle);
  } else {
    injectMainBundle();
  }
})();
