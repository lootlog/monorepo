import { createFileRoute } from "@tanstack/react-router";
import { allDocs } from "content-collections";
import { processMarkdown, extractHeadings } from "~/utils/markdown";
import { MarkdownContent } from "~/components/markdown";
import { TableOfContents } from "~/components/table-of-contents";

export const Route = createFileRoute("/docs/$slug")({
  loader: async ({ params }) => {
    const doc = allDocs.find((d) => d.slug === params.slug);
    if (!doc) {
      throw new Error(`Document not found: ${params.slug}`);
    }

    const html = await processMarkdown(doc.content);
    const headings = extractHeadings(html);

    return { doc, html, headings };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.doc.title} - Lootlog Docs` },
      { name: "description", content: loaderData?.doc.description },
    ],
  }),
  component: DocPage,
});

function DocPage() {
  const { doc, html, headings } = Route.useLoaderData();

  return (
    <div className="flex gap-10">
      <article className="min-w-0 flex-1 px-6 py-12 lg:px-10">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {doc.title}
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground/70">
              {doc.description}
            </p>
            <div className="mt-6 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
          </div>

          {/* Content */}
          <MarkdownContent html={html} />
        </div>
      </article>

      {headings.length > 0 && (
        <aside className="hidden xl:block w-56 shrink-0 py-12">
          <TableOfContents headings={headings} />
        </aside>
      )}
    </div>
  );
}
