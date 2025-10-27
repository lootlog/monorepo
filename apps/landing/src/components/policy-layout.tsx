import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PolicyLayoutProps {
  children: ReactNode;
  lastUpdated?: string;
}

export function PolicyLayout({ children, lastUpdated }: PolicyLayoutProps) {
  return (
    <div className="min-h-screen">
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do strony głównej
          </Link>
          {lastUpdated && (
            <p className="text-sm text-gray-400 mb-6 text-center">
              Data ostatniej aktualizacji: {lastUpdated}
            </p>
          )}
          <div className="backdrop-blur-sm rounded-xl p-8 space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
