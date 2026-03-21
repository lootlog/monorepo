import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <div className="flex flex-col gap-0">
            <span className="text-sm font-semibold tracking-tight text-fd-foreground">
              Lootlog.pl
            </span>
            <span className="text-[11px] text-fd-muted-foreground">
              Dokumentacja
            </span>
          </div>
        ),
        url: "/docs",
      }}
    >
      {children}
    </DocsLayout>
  );
}
