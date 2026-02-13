import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@lootlog/ui/components/button";

export default function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Lootlog Admin</h1>
          <p className="text-xs text-muted-foreground">
            User management and moderation tooling
          </p>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/users">Users</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/addons">Addons</Link>
          </Button>
        </nav>
      </header>

      <section className="flex-1">{children}</section>
    </div>
  );
}
