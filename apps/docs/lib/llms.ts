import {
  formatLlmsIndex,
  formatPageMarkdown,
  getMarkdownPath,
  groupPageUrls,
} from "@lootlog/ui/lib/docs-markdown";
import { source } from "@/lib/source";

const origin = "https://docs.lootlog.pl";

type DocsPage = ReturnType<typeof source.getPages>[number];

export function getPageMarkdownPath(page: DocsPage) {
  return getMarkdownPath(page.url, page.slugs);
}

export async function renderPageMarkdown(page: DocsPage) {
  return formatPageMarkdown({
    title: page.data.title,
    description: page.data.description,
    url: `${origin}${page.url}`,
    content: await page.data.getText("processed"),
  });
}

/** Pages in sidebar order, then the pages hidden from the sidebar. */
function getSections() {
  const pages = source.getPages();
  const pagesByUrl = new Map(pages.map((page) => [page.url, page]));

  const sections = groupPageUrls(source.getPageTree().children, "Start").map(
    (section) => ({
      title: section.title,
      pages: section.urls.flatMap((url) => pagesByUrl.get(url) ?? []),
    }),
  );

  const listed = new Set(sections.flatMap((section) => section.pages));
  const hidden = pages.filter((page) => !listed.has(page));

  return hidden.length > 0
    ? [...sections, { title: "Pozostałe strony", pages: hidden }]
    : sections;
}

export function renderLlmsIndex() {
  return formatLlmsIndex({
    title: "Dokumentacja Lootlog",
    summary:
      "Lootlog to darmowy, otwarty dodatek do gry Margonem z panelem webowym i botem Discord: zapisuje timery respów, łupy, zabicia i walki graczy oraz udostępnia je ich grupie.",
    notes: `
Dokumentacja dla graczy jest po polsku. Każda strona ma wersję Markdown pod tym samym adresem z końcówką \`.md\`; cała dokumentacja w jednym pliku jest pod ${origin}/llms-full.txt.

Pojęcia: „Lootlog” w treści oznacza też grupę graczy, która korzysta z Lootloga razem. Każdy taki Lootlog jest przypięty do jednego serwera Discord, a dostęp do niego daje członkostwo na tym serwerze. Klan to wyłącznie klan w grze Margonem; jeden Lootlog może obejmować kilka klanów i graczy bez klanu. Logowanie odbywa się wyłącznie przez Discord.

Integracje, API i SDK opisuje portal dla programistów (po angielsku): https://developer.lootlog.pl/llms.txt
`,
    sections: getSections().map((section) => ({
      title: section.title,
      links: section.pages.map((page) => ({
        title: page.data.title,
        url: `${origin}${getPageMarkdownPath(page)}`,
        description: page.data.description,
      })),
    })),
  });
}

export async function renderLlmsFull() {
  const pages = getSections().flatMap((section) => section.pages);
  const rendered = await Promise.all(pages.map(renderPageMarkdown));

  return rendered.join("\n---\n\n");
}
