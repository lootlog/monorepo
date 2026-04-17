import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n/config";
import "./index.css";

ReactDOM.createRoot(
  (() => {
    const app = document.createElement("div");
    app.id = "lootlog-root";
    app.className =
      "ll:absolute ll:top-0 ll:left-0 ll:z-20 ll:h-screen ll:w-screen ll:pointer-events-none";
    document.body.append(app);
    return app;
  })(),
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
