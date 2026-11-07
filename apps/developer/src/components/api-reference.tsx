import {
  ApiReferenceReact,
  type AnyApiReferenceConfiguration,
} from "@scalar/api-reference-react";
import { useRef } from "react";
import { portalText as t } from "~/lib/translations";
import { useReferenceNavigationMotion } from "~/lib/use-reference-navigation-motion";
// Imported here, not by the route, so only the reference page loads Scalar's CSS.
import "~/styles/reference.css";

// Scalar reapplies navigation when configuration changes, including on hash renders.
const configuration = {
  persistAuth: false,
  proxyUrl: "",
  theme: "none",
  darkMode: true,
  forceDarkModeState: "dark",
  hideDarkModeToggle: true,
  hideClientButton: true,
  withDefaultFonts: false,
  showDeveloperTools: "never",
  mcp: { disabled: true },
  documentDownloadType: "json",
  defaultHttpClient: { targetKey: "shell", clientKey: "curl" },
  hiddenClients: {
    c: true,
    clojure: true,
    csharp: true,
    dart: true,
    fsharp: true,
    http: true,
    java: true,
    kotlin: true,
    objc: true,
    ocaml: true,
    powershell: true,
    r: true,
    ruby: true,
    rust: true,
    swift: true,
  },
  authentication: {
    preferredSecurityScheme: "apiKey",
    securitySchemes: { apiKey: { value: "" } },
  },
  sources: (
    ["main", "activity", "battlelog", "catalog", "search"] as const
  ).map((service) => ({
    title: t[service],
    url: `${import.meta.env.BASE_URL}openapi/${service}.json`,
    slug: service,
    agent: { disabled: true },
  })),
} satisfies AnyApiReferenceConfiguration;

export function ApiReference() {
  const root = useRef<HTMLDivElement>(null);
  useReferenceNavigationMotion(root);

  return (
    <div ref={root} className="reference-page">
      <ApiReferenceReact configuration={configuration} />
    </div>
  );
}
