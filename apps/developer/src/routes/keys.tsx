import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { KeySession } from "@/components/key-session";
import { createKeyQueryClient } from "@/lib/key-queries";
import { PortalFooter } from "@/components/portal-footer";
import { createPortalSession } from "@/lib/portal-session";
import { pageHead } from "@/lib/seo";
import { portalText as t } from "@/lib/translations";

const guides = [
  { slug: "keys", label: t.keyGuide },
  { slug: "http", label: t.httpGuide },
  { slug: "errors", label: t.errorsGuide },
  { slug: "sdk", label: t.sdk },
] as const;

export const Route = createFileRoute("/keys")({
  ssr: false,
  head: () =>
    pageHead({
      path: "/keys",
      title: t.keys,
      description: t.keysDescriptionMeta,
      noindex: true,
    }),
  component: KeysPage,
});

function KeysPage() {
  const [authClient] = useState(() => createPortalSession(location.hostname));
  const [queryClient] = useState(createKeyQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="portal-page grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-14">
        <KeySession authClient={authClient} />
        <aside aria-labelledby="key-guides" className="lg:pt-2">
          <h2
            id="key-guides"
            className="mb-3 text-xs font-semibold text-muted-foreground"
          >
            {t.guides}
          </h2>
          <ul className="flex flex-col">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <Link
                  to="/docs/$"
                  params={{ _splat: guide.slug }}
                  className="block rounded-md py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {guide.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <PortalFooter />
    </QueryClientProvider>
  );
}
