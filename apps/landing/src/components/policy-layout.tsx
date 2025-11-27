import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LandingHeader, LandingFooter } from "@/src/components/landing";

interface PolicyLayoutProps {
  children: ReactNode;
  lastUpdated?: string;
}

export function PolicyLayout({ children, lastUpdated }: PolicyLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-white flex flex-col">
      <LandingHeader />

      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do strony głównej
          </Link>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mb-6">
              Data ostatniej aktualizacji: {lastUpdated}
            </p>
          )}
          <div className="rounded-lg border border-border bg-card p-8 space-y-6">
            {children}
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
