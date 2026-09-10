import React from "react";
import { LazyMotion } from "framer-motion";
import ReactDOM from "react-dom/client";
import { configureWebApiClients } from "@/lib/configure-api-clients";
import App from "./App.tsx";
import "./reduced-motion.css";

const loadMotionFeatures = () =>
  import("framer-motion").then(({ domMax }) => domMax);

configureWebApiClients();

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <LazyMotion features={loadMotionFeatures}>
        <App />
      </LazyMotion>
    </React.StrictMode>,
  );
}
