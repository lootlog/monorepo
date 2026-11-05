import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
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
import { pageHead } from "~/lib/seo";
import { docs, source } from "~/lib/source";
import { portalText } from "~/lib/translations";

const mdxComponents = { ...defaultMdxComponents, Step, Steps, Tab, Tabs };

/** The router base path ends with a slash, page URLs start with one. */
function withBasePath(path: string) {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}${path}`;
}

const loadPage = createServerFn({ method: "GET" })
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data }) => {
    const page = source.getPage(data);

    if (!page) throw notFound();

    return {
      path: page.path,
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      markdownPath: getMarkdownPath(page.url, page.slugs),
      pageTree: await source.serializePageTree(source.getPageTree()),
    };
  });

export const Route = createFileRoute("/docs/$")({
  loader: async ({ params }) => {
    const data = await loadPage({
      data: params._splat?.split("/").filter(Boolean) ?? [],
    });

    await docs.getPage(data.path)?.preload();

    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};

    const head = pageHead({
      path: loaderData.url,
      title: loaderData.title,
      description: loaderData.description ?? portalText.docsDescription,
      type: loaderData.path === "index.mdx" ? "website" : "article",
    });

    return {
      ...head,
      links: [
        ...head.links,
        {
          rel: "alternate",
          type: "text/markdown",
          href: withBasePath(loaderData.markdownPath),
        },
      ],
    };
  },
  component: Documentation,
});

function Documentation() {
  const { pageTree, path, markdownPath } = useFumadocsLoader(
    Route.useLoaderData(),
  );

  const page = docs.getPage(path);

  if (!page) throw notFound();

  const { toc } = use(page.load());
  const MDX = page.body;

  return (
    <DocsLayout
      tree={pageTree}
      nav={{ title: portalText.docs, url: "/docs" }}
      themeSwitch={{ enabled: false }}
      searchToggle={{ enabled: false }}
      containerProps={{ className: "documentation-layout" }}
    >
      <DocsPage toc={toc} tableOfContent={{ style: "clerk" }}>
        <DocsTitle>{page.title}</DocsTitle>
        <DocsDescription className="mb-0">{page.description}</DocsDescription>
        <PageMarkdownActions
          markdownUrl={withBasePath(markdownPath)}
          labels={portalText.markdownActions}
        />
        <DocsBody>
          <MDX components={mdxComponents} />
        </DocsBody>
        <EditOnGitHub
          href={`https://github.com/lootlog/monorepo/blob/main/apps/developer/content/docs/${path}`}
          className="self-start"
        >
          {portalText.editOnGitHub}
        </EditOnGitHub>
      </DocsPage>
    </DocsLayout>
  );
}
