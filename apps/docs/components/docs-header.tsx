"use client";

import { useDocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBrand } from "./docs-brand";

export function DocsHeader() {
  const { slots } = useDocsLayout();

  return (
    <header className="docs-header">
      <DocsBrand />
      <nav className="docs-header-links" aria-label="Główne linki">
        <a href="https://lootlog.pl">Strona główna</a>
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
      <div className="docs-header-actions">
        {slots.searchTrigger && (
          <>
            <slots.searchTrigger.full
              hideIfDisabled
              className="docs-header-search"
            />
            <slots.searchTrigger.sm
              hideIfDisabled
              className="docs-header-search-mobile"
            />
          </>
        )}
        <slots.sidebar.trigger className="docs-menu-trigger">
          <span aria-hidden="true">☰</span>
          <span className="sr-only">Otwórz nawigację</span>
        </slots.sidebar.trigger>
      </div>
    </header>
  );
}
