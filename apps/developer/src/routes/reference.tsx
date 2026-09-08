import { createFileRoute } from "@tanstack/react-router";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { PortalNav } from "~/components/portal-nav";
import { getPortalEnvironment } from "~/lib/environment";
import { portalText as t } from "~/lib/translations";
export const Route = createFileRoute("/reference")({
  ssr: false,
  component: ReferencePage,
});
function ReferencePage() {
  const environment = getPortalEnvironment(location.hostname);
  return (
    <>
      <div className="portal-page">
        <PortalNav />
        <h1>{t.reference}</h1>
        <p>{environment.production ? t.production : t.dev}</p>
      </div>
      <ApiReferenceReact
        configuration={{
          persistAuth: false,
          proxyUrl: "",
          theme: "default",
          darkMode: true,
          sources: (["main", "activity", "battlelog", "search"] as const).map(
            (service) => ({
              title: t[service],
              url: `/openapi/${service}.json`,
              slug: service,
            }),
          ),
        }}
      />
    </>
  );
}
