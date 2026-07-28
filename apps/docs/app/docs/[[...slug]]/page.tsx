import { DocsChapterRail } from "@/components/docs-chapter-rail";
import { ProductScreenshot } from "@/components/product-screenshot";
import { getChapterBySlug } from "@/lib/docs-chapters";
import { source } from "@/lib/source";
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { CSSProperties } from "react";

type ChapterStyle = CSSProperties & {
  "--active-chapter-color": string;
};

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) notFound();

  const MDX = page.data.body;
  const chapter = getChapterBySlug(params.slug);

  return (
    <DocsPage
      toc={page.data.toc}
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
          <DocsTitle>{page.data.title}</DocsTitle>
          <DocsDescription>{page.data.description}</DocsDescription>
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
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
