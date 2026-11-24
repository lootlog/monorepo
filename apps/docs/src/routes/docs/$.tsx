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
import { useScrollToTop } from "@lootlog/ui/hooks/use-scroll-to-top";
import {
  COMMUNITY_LINKS,
  LOOTLOG_SOCIAL_IMAGE,
  PUBLIC_SITE_ORIGINS,
  publicPageHead,
} from "@lootlog/domain/public-sites";
import { ProductScreenshot } from "@/components/product-screenshot";
import { docsSite } from "@/lib/llms";
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
      url: page.url,
      markdownPath: docsSite.getPageMarkdownPath(page),
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

    const head = publicPageHead({
      url: `${PUBLIC_SITE_ORIGINS.docs}${loaderData.url}`,
      siteName: docsTranslations.metadata.title,
      title: loaderData.title,
      documentTitle: `${loaderData.title} | ${docsTranslations.metadata.title}`,
      description: loaderData.description,
      image: LOOTLOG_SOCIAL_IMAGE,
      type: "article",
    });

    return {
      ...head,
      links: [
        ...head.links,
        {
          rel: "alternate",
          type: "text/markdown",
          href: loaderData.markdownPath,
        },
      ],
    };
  },
  component: DocsRoute,
});

function DocsRoute() {
  const { pageTree, path, markdownPath } = useFumadocsLoader(
    Route.useLoaderData(),
  );

  useScrollToTop(path);

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
      <DocsPage toc={toc} tableOfContent={{ style: "clerk" }}>
        <DocsTitle>{page.title}</DocsTitle>
        <DocsDescription className="mb-0">{page.description}</DocsDescription>
        <PageMarkdownActions
          markdownUrl={markdownPath}
          labels={docsTranslations.markdownActions}
        />
        <DocsBody>
          <MDX components={mdxComponents} />
        </DocsBody>
        <EditOnGitHub
          href={`${COMMUNITY_LINKS.github}/blob/main/apps/docs/content/docs/${path}`}
          className="self-start"
        >
          {docsTranslations.editOnGitHub}
        </EditOnGitHub>
      </DocsPage>
    </DocsLayout>
  );
}
