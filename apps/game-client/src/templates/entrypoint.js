const url = "$GAME_CLIENT_URL$";

const version = "$GAME_CLIENT_VERSION$";

// ==UserScript==
// @name       @lootlog/game-client
// @namespace  npm/vite-plugin-monkey
// @version    1.0.2
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

  // The bundle never ran, so this notice cannot use its translations or
  // stylesheet: plain DOM, inline styles, Polish copy.
  const showLoadFailure = () => {
    const noticeId = "lootlog-loader-notice";

    if (document.getElementById(noticeId)) return;

    const notice = document.createElement("div");
    notice.id = noticeId;
    notice.setAttribute("role", "alert");
    notice.style.cssText = [
      "position:fixed",
      "top:68px",
      "left:50%",
      "transform:translateX(-50%)",
      "z-index:10000",
      "box-sizing:border-box",
      "width:min(360px, calc(100vw - 32px))",
      "padding:12px",
      "border-radius:10px",
      "border:1px solid rgba(255, 255, 255, 0.5)",
      "background:rgb(0, 0, 0)",
      "box-shadow:2px 2px 3px 3px rgba(12, 13, 13, 0.4)",
      "color:rgb(255, 255, 255)",
      "font:12px/16px Arimo, Calibri, Segoe, sans-serif",
      "text-align:left",
    ].join(";");

    const title = document.createElement("p");
    title.style.cssText = "margin:0;font-weight:600";
    title.textContent = "Nie udało się wczytać Lootloga";

    const description = document.createElement("p");
    description.style.cssText = "margin:4px 0 0;color:rgba(255, 255, 255, 0.7)";
    description.textContent =
      "Skrypt dodatku nie dotarł. Sprawdź połączenie z internetem i przeładuj stronę.";

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = "Zamknij komunikat";
    dismiss.style.cssText = [
      "display:block",
      "margin:12px 0 0 auto",
      "box-sizing:border-box",
      "height:24px",
      "padding:0 8px",
      "border-radius:6px",
      "border:1px solid rgba(255, 255, 255, 0.3)",
      "background:transparent",
      "color:inherit",
      "font:500 12px/16px Arimo, Calibri, Segoe, sans-serif",
      "cursor:pointer",
    ].join(";");
    dismiss.addEventListener("click", () => notice.remove());

    // Presses on the notice must not reach the game underneath.
    for (const type of ["pointerdown", "mousedown", "click", "keydown"])
      notice.addEventListener(type, (event) => event.stopPropagation());

    notice.append(title, description, dismiss);
    (document.body || document.documentElement).append(notice);
  };

  const script = document.createElement("script");
  script.src = `${url}?v=${version}`;
  script.onerror = showLoadFailure;

  document.head.appendChild(script);
})();
