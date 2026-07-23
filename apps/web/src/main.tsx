import React from "react";
import ReactDOM from "react-dom/client";
import { configureWebApiClients } from "@/lib/configure-api-clients";
import App from "./App.tsx";
import "./reduced-motion.css";

configureWebApiClients();

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
