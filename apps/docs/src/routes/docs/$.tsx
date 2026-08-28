import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { staticFunctionMiddleware } from "@tanstack/start-static-server-functions";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { use, type CSSProperties } from "react";
import { DocsChapterRail } from "@/components/docs-chapter-rail";
import { DocsHeader } from "@/components/docs-header";
import { DocsScrollToTop } from "@/components/docs-scroll-to-top";
import { DocsSidebarSeparator } from "@/components/docs-sidebar-separator";
import { ProductScreenshot } from "@/components/product-screenshot";
import { getChapterBySlug } from "@/lib/docs-chapters";
import { docs, source } from "@/lib/source";

type DocsLayoutStyle = CSSProperties & {
  "--fd-header-height": string;
};

type ChapterStyle = CSSProperties & {
  "--active-chapter-color": string;
};

const loadStaticPage = createServerFn({ method: "GET" })
  .validator((slugs: string[]) => slugs)
  .middleware([staticFunctionMiddleware])
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);

    if (!page) {
      throw notFound();
    }

    return {
      path: page.path,
      slugs,
      pageTree: await source.serializePageTree(source.getPageTree()),
    };
  });

export const Route = createFileRoute("/docs/$")({
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];
    const data = await loadStaticPage({ data: slugs });

    await docs.getPage(data.path)?.preload();

    return data;
  },
  component: DocsRoute,
});

function DocsRoute() {
  const { pageTree, path, slugs } = useFumadocsLoader(Route.useLoaderData());
  const page = docs.getPage(path);

  if (!page) {
    throw new Error(`Unknown documentation page: ${path}`);
  }

  const { toc } = use(page.load());
  const MDX = page.body;
  const chapter = getChapterBySlug(slugs);

  return (
    <DocsLayout
      tree={pageTree}
      nav={{ url: "/docs" }}
      themeSwitch={{ enabled: false }}
      searchToggle={{
        full: { className: "docs-search-trigger" },
        sm: { className: "docs-search-trigger-mobile" },
      }}
      slots={{ header: DocsHeader }}
      containerProps={{
        className: "docs-layout",
        style: {
          "--fd-header-height": "72px",
          gridTemplate: `"header header header"
"sidebar toc-popover toc"
"sidebar main toc" 1fr / var(--fd-sidebar-col) minmax(0, 1fr) var(--fd-toc-width)`,
        } as DocsLayoutStyle,
      }}
      sidebar={{
        collapsible: false,
        components: { Separator: DocsSidebarSeparator },
        footer: (
          <nav className="docs-sidebar-footer" aria-label="Linki Lootlog">
            <a href="https://lootlog.pl">lootlog.pl</a>
            <a
              href="https://github.com/lootlog/monorepo"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg/mPcczaeYMu"
              target="_blank"
              rel="noreferrer"
            >
              Discord
            </a>
          </nav>
        ),
      }}
    >
      <DocsScrollToTop />
      <DocsPage
        toc={toc}
        footer={{ className: "docs-page-footer" }}
        className={`docs-article docs-chapter-${chapter.id}`}
        style={{ "--active-chapter-color": chapter.color } as ChapterStyle}
      >
        <div className="docs-article-content">
          <DocsChapterRail activeChapterId={chapter.id} />
          <div className="docs-article-heading">
            <p className="docs-article-kicker">
              {chapter.number} · {chapter.label}
            </p>
            <DocsTitle>{page.title}</DocsTitle>
            <DocsDescription>{page.description}</DocsDescription>
          </div>
          <DocsBody className="docs-body">
            <MDX
              components={{
                ...defaultMdxComponents,
                ProductScreenshot,
              }}
            />
          </DocsBody>
        </div>
      </DocsPage>
    </DocsLayout>
  );
}
