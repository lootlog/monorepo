import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ httpEquiv: "refresh", content: "0;url=/docs" }],
    links: [{ rel: "canonical", href: "https://docs.lootlog.pl/docs" }],
  }),
  component: DocsRedirect,
});

function DocsRedirect() {
  const navigate = Route.useNavigate();

  useEffect(() => {
    void navigate({ to: "/docs/$", params: { _splat: "" }, replace: true });
  }, [navigate]);

  return (
    <main>
      <p>
        Przejdź do{" "}
        <Link to="/docs/$" params={{ _splat: "" }}>
          dokumentacji Lootlog
        </Link>
        .
      </p>
    </main>
  );
}
