import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { docsTranslations } from "@/lib/polish-translations";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ httpEquiv: "refresh", content: "0;url=/docs" }],
    links: [{ rel: "canonical", href: "https://docs.lootlog.pl/docs" }],
  }),
  component: DocsRedirect,
});

function DocsRedirect() {
  const navigate = Route.useNavigate();
  const { linkLabel, prefix, suffix } = docsTranslations.redirect;

  useEffect(() => {
    void navigate({ to: "/docs/$", params: { _splat: "" }, replace: true });
  }, [navigate]);

  return (
    <main>
      <p>
        {prefix}{" "}
        <Link to="/docs/$" params={{ _splat: "" }}>
          {linkLabel}
        </Link>
        {suffix}
      </p>
    </main>
  );
}
