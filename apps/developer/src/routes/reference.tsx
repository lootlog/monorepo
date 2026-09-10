import { createFileRoute } from "@tanstack/react-router";
import {
  ApiReferenceReact,
  type AnyApiReferenceConfiguration,
} from "@scalar/api-reference-react";
import { portalText as t } from "~/lib/translations";

// Scalar reapplies navigation when configuration changes, including on hash renders.
const configuration = {
  persistAuth: false,
  proxyUrl: "",
  theme: "none",
  darkMode: true,
  hideDarkModeToggle: true,
  hideClientButton: true,
  showDeveloperTools: "never",
  mcp: { disabled: true },
  sources: (["main", "activity", "battlelog", "search"] as const).map(
    (service) => ({
      title: t[service],
      url: `${import.meta.env.BASE_URL}openapi/${service}.json`,
      slug: service,
      agent: { disabled: true },
    }),
  ),
} satisfies AnyApiReferenceConfiguration;

export const Route = createFileRoute("/reference")({
  ssr: false,
  component: ReferencePage,
});

function ReferencePage() {
  return (
    <div className="reference-page">
      <ApiReferenceReact configuration={configuration} />
    </div>
  );
}
