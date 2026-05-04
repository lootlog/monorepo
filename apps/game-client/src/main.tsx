import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n/config";
import "./index.css";

const ROOT_Z_INDEX_BY_INTERFACE = {
  ni: 11,
  si: 449,
} as const;

type GameInterface = keyof typeof ROOT_Z_INDEX_BY_INTERFACE;

function getDocumentCookie(name: string): string | null {
  const cookie = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    return cookie.slice(name.length + 1);
  }
}

export function getLootlogRootZIndex(): number {
  const gameInterface =
    window.getCookie?.("interface") ?? getDocumentCookie("interface");

  if (gameInterface === "si" || gameInterface === "ni") {
    return ROOT_Z_INDEX_BY_INTERFACE[gameInterface satisfies GameInterface];
  }

  return ROOT_Z_INDEX_BY_INTERFACE.ni;
}

ReactDOM.createRoot(
  (() => {
    const app = document.createElement("div");
    app.id = "lootlog-root";
    app.className =
      "ll:absolute ll:top-0 ll:left-0 ll:h-screen ll:w-screen ll:pointer-events-none";
    app.style.zIndex = String(getLootlogRootZIndex());
    document.body.append(app);
    return app;
  })(),
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
