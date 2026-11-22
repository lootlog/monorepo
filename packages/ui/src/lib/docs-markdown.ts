export function getMarkdownPath(pageUrl: string, slugs: readonly string[]) {
  return slugs.length === 0 ? `${pageUrl}/index.md` : `${pageUrl}.md`;
}

function formatPageMarkdown(page: {
  title: string;
  description?: string;
  url: string;
  content: string;
}) {
  const description = page.description ? `> ${page.description}\n\n` : "";

  return `# ${page.title}\n\n${description}Source: ${page.url}\n\n${page.content.trim()}\n`;
}

function markdownResponse(body: string, type = "text/markdown") {
  return new Response(body, {
    headers: { "Content-Type": `${type}; charset=utf-8` },
  });
}

type LlmsLink = { title: string; url: string; description?: string };

type LlmsSection = { title: string; links: LlmsLink[] };

function formatLlmsIndex(index: {
  title: string;
  summary: string;
  notes: string;
  sections: readonly LlmsSection[];
}) {
  const sections = index.sections
    .filter((section) => section.links.length > 0)
    .map((section) => {
      const links = section.links.map((link) => {
        const target = `[${link.title}](${link.url})`;

        return link.description
          ? `- ${target}: ${link.description}`
          : `- ${target}`;
      });

      return `## ${section.title}\n\n${links.join("\n")}`;
    });

  return `# ${index.title}\n\n> ${index.summary}\n\n${index.notes.trim()}\n\n${sections.join("\n\n")}\n`;
}

type PageTreeNode =
  | { type: "separator"; name?: unknown }
  | { type: "page"; url: string; external?: boolean }
  | { type: "folder"; index?: PageTreeNode; children: PageTreeNode[] };

function groupPageUrls(nodes: readonly PageTreeNode[], firstSection: string) {
  type Section = { title: string; urls: string[] };

  const sections: Section[] = [];
  let current: Section = { title: firstSection, urls: [] };
  sections.push(current);

  const visit = (node: PageTreeNode) => {
    if (node.type === "separator") {
      current = {
        title: node.name ? String(node.name) : firstSection,
        urls: [],
      };
      sections.push(current);
    } else if (node.type === "page") {
      if (!node.external) current.urls.push(node.url);
    } else {
      if (node.index) visit(node.index);
      node.children.forEach(visit);
    }
  };

  nodes.forEach(visit);

  return sections.filter((section) => section.urls.length > 0);
}

const layoutComponents = new Set(["Steps", "Step", "Tabs", "Tab", "Cards"]);

export const llmsMarkdownOptions = {
  headingIds: false,
  filterElement: (node: { type: string; name?: string | null }) =>
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
    node.name &&
    layoutComponents.has(node.name)
      ? ("children-only" as const)
      : true,
};

type DocsSitePage = {
  url: string;
  slugs: string[];
  data: {
    title: string;
    description?: string;
    getText(type: "processed"): Promise<string>;
  };
};

type DocsSiteSource<Page extends DocsSitePage> = {
  getPages(): Page[];
  getPage(slugs: string[]): Page | undefined;
  getPageTree(): { children: readonly PageTreeNode[] };
};

export function createDocsSite<Page extends DocsSitePage>({
  source,
  origin,
  llms,
}: {
  source: DocsSiteSource<Page>;
  origin: string;
  llms: {
    title: string;
    summary: string;
    notes: string;
    firstSection: string;
    otherPagesSection: string;
    extraSections?: readonly LlmsSection[];
  };
}) {
  const getPageMarkdownPath = (page: Page) =>
    getMarkdownPath(page.url, page.slugs);

  const renderPageMarkdown = async (page: Page) =>
    formatPageMarkdown({
      title: page.data.title,
      description: page.data.description,
      url: `${origin}${page.url}`,
      content: await page.data.getText("processed"),
    });

  const getSections = () => {
    const pages = source.getPages();
    const pagesByUrl = new Map(pages.map((page) => [page.url, page]));

    const sections = groupPageUrls(
      source.getPageTree().children,
      llms.firstSection,
    ).map((section) => ({
      title: section.title,
      pages: section.urls.flatMap((url) => pagesByUrl.get(url) ?? []),
    }));

    const listed = new Set(sections.flatMap((section) => section.pages));
    const hidden = pages.filter((page) => !listed.has(page));

    return hidden.length > 0
      ? [...sections, { title: llms.otherPagesSection, pages: hidden }]
      : sections;
  };

  return {
    getPageMarkdownPath,

    async pageMarkdownResponse(slug: string) {
      const page = source.getPage(slug === "index" ? [] : [slug]);

      if (!page) return new Response("Not found", { status: 404 });

      return markdownResponse(await renderPageMarkdown(page));
    },

    llmsIndexResponse() {
      const index = formatLlmsIndex({
        title: llms.title,
        summary: llms.summary,
        notes: llms.notes,
        sections: [
          ...getSections().map((section) => ({
            title: section.title,
            links: section.pages.map((page) => ({
              title: page.data.title,
              url: `${origin}${getPageMarkdownPath(page)}`,
              description: page.data.description,
            })),
          })),
          ...(llms.extraSections ?? []),
        ],
      });

      return markdownResponse(index, "text/plain");
    },

    async llmsFullResponse() {
      const pages = getSections().flatMap((section) => section.pages);
      const rendered = await Promise.all(pages.map(renderPageMarkdown));

      return markdownResponse(rendered.join("\n---\n\n"), "text/plain");
    },
  };
}
