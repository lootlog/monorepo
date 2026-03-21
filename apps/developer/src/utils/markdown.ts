import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import { codeToHtml } from "shiki";

export interface Heading {
  id: string;
  text: string;
  level: number;
}

async function highlightCode(html: string): Promise<string> {
  const codeBlockRegex =
    /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g;
  const matches = [...html.matchAll(codeBlockRegex)];

  let result = html;
  const highlights = await Promise.all(
    matches.map(async (match) => {
      const [fullMatch, lang, code] = match;
      const decoded = code
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      const highlighted = await codeToHtml(decoded, {
        lang,
        theme: "github-dark-default",
      });
      return { fullMatch, highlighted };
    }),
  );

  for (const { fullMatch, highlighted } of highlights) {
    result = result.replace(fullMatch, highlighted);
  }

  return result;
}

export async function processMarkdown(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(rehypeStringify)
    .process(content);

  const html = String(result);
  return highlightCode(html);
}

export function extractHeadings(html: string): Heading[] {
  const headingRegex = /<h([2-3])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  const headings: Heading[] = [];

  for (const match of html.matchAll(headingRegex)) {
    const text = (match[3] ?? "").replace(/<[^>]+>/g, "").trim();
    headings.push({
      id: match[2] ?? "",
      level: Number.parseInt(match[1] ?? "2", 10),
      text,
    });
  }

  return headings;
}
