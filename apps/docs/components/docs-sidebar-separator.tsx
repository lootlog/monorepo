import { getChapterBySeparator } from "@/lib/docs-chapters";
import type * as PageTree from "fumadocs-core/page-tree";
import type { CSSProperties } from "react";

type SeparatorProps = {
  item: PageTree.Separator;
};

type SeparatorStyle = CSSProperties & {
  "--chapter-color": string;
};

export function DocsSidebarSeparator({ item }: SeparatorProps) {
  const chapter = getChapterBySeparator(item.name);

  if (!chapter) {
    return <div className="docs-sidebar-section">{item.name}</div>;
  }

  return (
    <div
      className={`docs-sidebar-section docs-sidebar-section-${chapter.id}`}
      style={{ "--chapter-color": chapter.color } as SeparatorStyle}
    >
      <span className="docs-sidebar-section-bar" aria-hidden="true" />
      <span className="docs-sidebar-section-number">{chapter.number}</span>
      <span>{chapter.label}</span>
    </div>
  );
}
