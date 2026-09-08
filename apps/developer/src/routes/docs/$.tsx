import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { use } from "react";
import { docs, source } from "~/lib/source";
import { portalText } from "~/lib/translations";
const loadPage = createServerFn({ method: "GET" })
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data }) => {
    const page = source.getPage(data);
    if (!page) throw notFound();
    return {
      path: page.path,
      title: page.data.title,
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
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? portalText.title} | Lootlog` }],
  }),
  component: Documentation,
});
function Documentation() {
  const { pageTree, path } = useFumadocsLoader(Route.useLoaderData());
  const page = docs.getPage(path);
  if (!page) throw notFound();
  const { toc } = use(page.load());
  const MDX = page.body;
  return (
    <DocsLayout
      tree={pageTree}
      nav={{ title: portalText.title, url: "/docs" }}
      themeSwitch={{ enabled: false }}
      links={[
        { text: portalText.reference, url: "/reference" },
        { text: portalText.keys, url: "/keys" },
      ]}
    >
      <DocsPage toc={toc}>
        <DocsTitle>{page.title}</DocsTitle>
        <DocsDescription>{page.description}</DocsDescription>
        <DocsBody>
          <MDX components={defaultMdxComponents} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
