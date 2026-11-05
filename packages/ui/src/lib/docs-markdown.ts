/**
 * Markdown versions of documentation pages for AI assistants, following the
 * llms.txt convention (https://llmstxt.org): `/llms.txt` lists the pages,
 * `/llms-full.txt` holds all of them, and every page has a `.md` twin.
 */

/** The `.md` twin of a documentation page URL; the index is `/docs/index.md`. */
export function getMarkdownPath(pageUrl: string, slugs: readonly string[]) {
  return slugs.length === 0 ? `${pageUrl}/index.md` : `${pageUrl}.md`;
}

export function formatPageMarkdown(page: {
  title: string;
  description?: string;
  url: string;
  content: string;
}) {
  const description = page.description ? `> ${page.description}\n\n` : "";

  return `# ${page.title}\n\n${description}Source: ${page.url}\n\n${page.content.trim()}\n`;
}

export function markdownResponse(body: string, type = "text/markdown") {
  return new Response(body, {
    headers: { "Content-Type": `${type}; charset=utf-8` },
  });
}

export type LlmsLink = { title: string; url: string; description?: string };

export type LlmsSection = { title: string; links: LlmsLink[] };

/** The `/llms.txt` index: a title, a one-line summary, notes and link lists. */
export function formatLlmsIndex(index: {
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

/**
 * Groups the pages of a Fumadocs page tree under its separators, in sidebar
 * order. Pages before the first separator go under `firstSection`.
 */
export function groupPageUrls(
  nodes: readonly PageTreeNode[],
  firstSection: string,
) {
  type Section = { title: string; urls: string[] };

  const sections: Section[] = [];
  let current: Section = { title: firstSection, urls: [] };
  sections.push(current);

  const visit = (node: PageTreeNode) => {
    if (node.type === "separator") {
      current = {
        // Separators come from `---Name---` entries in meta.json.
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

/** Layout-only MDX components: their content matters, the wrapper does not. */
const layoutComponents = new Set(["Steps", "Step", "Tabs", "Tab", "Cards"]);

/** Fumadocs `includeProcessedMarkdown` options for the `.md` page versions. */
export const llmsMarkdownOptions = {
  headingIds: false,
  filterElement: (node: { type: string; name?: string | null }) =>
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
    node.name &&
    layoutComponents.has(node.name)
      ? ("children-only" as const)
      : true,
};
