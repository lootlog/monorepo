import { DocsHeader } from "@/components/docs-header";
import { DocsScrollToTop } from "@/components/docs-scroll-to-top";
import { DocsSidebarSeparator } from "@/components/docs-sidebar-separator";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";
import type { CSSProperties, ReactNode } from "react";

type DocsLayoutStyle = CSSProperties & {
  "--fd-header-height": string;
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{ url: "/docs" }}
      themeSwitch={{ enabled: false }}
      searchToggle={{
        full: { className: "docs-search-trigger" },
        sm: { className: "docs-search-trigger-mobile" },
      }}
      slots={{ header: DocsHeader }}
      containerProps={{
        className: "docs-layout",
        style: {
          "--fd-header-height": "72px",
          gridTemplate: `"header header header"
"sidebar toc-popover toc"
"sidebar main toc" 1fr / var(--fd-sidebar-col) minmax(0, 1fr) var(--fd-toc-width)`,
        } as DocsLayoutStyle,
      }}
      sidebar={{
        collapsible: false,
        components: { Separator: DocsSidebarSeparator },
        footer: (
          <nav className="docs-sidebar-footer" aria-label="Linki Lootlog">
            <a href="https://lootlog.pl">lootlog.pl</a>
            <a
              href="https://github.com/lootlog/monorepo"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg/mPcczaeYMu"
              target="_blank"
              rel="noreferrer"
            >
              Discord
            </a>
          </nav>
        ),
      }}
    >
      <DocsScrollToTop />
      {children}
    </DocsLayout>
  );
}
