import { createFileRoute, Link } from "@tanstack/react-router";
import { allDocs } from "content-collections";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/docs/")({
  head: () => ({
    meta: [
      { title: "Dokumentacja - Lootlog" },
      {
        name: "description",
        content: "Przeglądaj dokumentację Lootlog",
      },
    ],
  }),
  component: DocsIndexPage,
});

function DocsIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-10">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Dokumentacja</h1>
      <p className="text-muted-foreground/70 mb-8">
        Przeglądaj wszystkie dostępne artykuły
      </p>
      <div className="flex flex-col gap-2">
        {allDocs.map((doc) => (
          <Link
            key={doc.slug}
            to="/docs/$slug"
            params={{ slug: doc.slug }}
            className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
          >
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-foreground/90 transition-colors duration-200 group-hover:text-foreground">
                {doc.title}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground/70">
                {doc.description}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 -translate-x-1 text-muted-foreground/0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-muted-foreground/60" />
          </Link>
        ))}
      </div>
    </div>
  );
}
