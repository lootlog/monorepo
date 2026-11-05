import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { staticFunctionMiddleware } from "@tanstack/start-static-server-functions";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  EditOnGitHub,
} from "fumadocs-ui/page";
import { use } from "react";
import { PageMarkdownActions } from "@lootlog/ui/components/page-markdown-actions";
import { getMarkdownPath } from "@lootlog/ui/lib/docs-markdown";
import { DocsScrollToTop } from "@/components/docs-scroll-to-top";
import { ProductScreenshot } from "@/components/product-screenshot";
import { docsTranslations } from "@/lib/polish-translations";
import { docs, source } from "@/lib/source";

const mdxComponents = {
  ...defaultMdxComponents,
  ProductScreenshot,
  Step,
  Steps,
  Tab,
  Tabs,
};

function getPageMarkdownPath(slugs: readonly string[]) {
  return getMarkdownPath(
    slugs.length ? `/docs/${slugs.join("/")}` : "/docs",
    slugs,
  );
}

const loadStaticPage = createServerFn({ method: "GET" })
  .validator((slugs: string[]) => slugs)
  .middleware([staticFunctionMiddleware])
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);

    if (!page) {
      throw notFound();
    }

    const { description, title } = page.data;

    if (!description || !title) {
      throw new Error(`Documentation page lacks metadata: ${page.path}`);
    }

    return {
      description,
      path: page.path,
      slugs,
      title,
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
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {};
    }

    return {
      links: [
        {
          rel: "canonical",
          href: `https://docs.lootlog.pl/docs${loaderData.slugs.length ? `/${loaderData.slugs.join("/")}` : ""}`,
        },
        {
          rel: "alternate",
          type: "text/markdown",
          href: getPageMarkdownPath(loaderData.slugs),
        },
      ],
      meta: [
        {
          title: `${loaderData.title} | ${docsTranslations.metadata.title}`,
        },
        { name: "description", content: loaderData.description },
      ],
    };
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

  return (
    <DocsLayout
      tree={pageTree}
      nav={{ title: docsTranslations.header.section, url: "/docs" }}
      themeSwitch={{ enabled: false }}
      searchToggle={{ enabled: false }}
      containerProps={{ className: "documentation-layout" }}
    >
      <DocsScrollToTop />
      <DocsPage toc={toc} tableOfContent={{ style: "clerk" }}>
        <DocsTitle>{page.title}</DocsTitle>
        <DocsDescription className="mb-0">{page.description}</DocsDescription>
        <PageMarkdownActions
          markdownUrl={getPageMarkdownPath(slugs)}
          labels={docsTranslations.markdownActions}
        />
        <DocsBody>
          <MDX components={mdxComponents} />
        </DocsBody>
        <EditOnGitHub
          href={`https://github.com/lootlog/monorepo/blob/main/apps/docs/content/docs/${path}`}
          className="self-start"
        >
          {docsTranslations.editOnGitHub}
        </EditOnGitHub>
      </DocsPage>
    </DocsLayout>
  );
}
