import { type ReactNode, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Book,
  Download,
  Rocket,
  Star,
  Calendar,
  HelpCircle,
  Menu,
  X,
  ExternalLink,
  Github,
  MessageCircle,
  Globe,
} from "lucide-react";

const navItems = [
  { title: "Wprowadzenie", href: "/docs/index", icon: Book },
  { title: "Instalacja", href: "/docs/installation", icon: Download },
  { title: "Podstawy używania", href: "/docs/getting-started", icon: Rocket },
  { title: "Funkcje", href: "/docs/features", icon: Star },
  { title: "Eventy klanowe", href: "/docs/events", icon: Calendar },
  { title: "FAQ", href: "/docs/faq", icon: HelpCircle },
];

const externalLinks = [
  {
    title: "lootlog.pl",
    href: "https://lootlog.pl",
    icon: Globe,
  },
  {
    title: "GitHub",
    href: "https://github.com/lootlog/monorepo",
    icon: Github,
  },
  {
    title: "Discord",
    href: "https://discord.gg/mPcczaeYMu",
    icon: MessageCircle,
  },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-5">
      <span className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        Dokumentacja
      </span>
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
              isActive
                ? "bg-white/[0.06] text-foreground font-medium shadow-[inset_0_0.5px_0_rgba(255,255,255,0.06)]"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            }`}
          >
            <item.icon
              className={`h-[15px] w-[15px] shrink-0 transition-colors duration-150 ${
                isActive
                  ? "text-foreground/70"
                  : "text-muted-foreground/50 group-hover:text-muted-foreground"
              }`}
            />
            {item.title}
          </Link>
        );
      })}

      <div className="mt-6 mb-1 border-t border-white/[0.06] pt-5">
        <span className="mb-1.5 block px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Linki
        </span>
      </div>
      {externalLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-all duration-150 hover:bg-white/[0.04] hover:text-foreground"
        >
          <link.icon className="h-[15px] w-[15px] shrink-0 text-muted-foreground/50 transition-colors duration-150 group-hover:text-muted-foreground" />
          {link.title}
          <ExternalLink className="ml-auto h-3 w-3 opacity-0 transition-opacity duration-150 group-hover:opacity-40" />
        </a>
      ))}
    </nav>
  );
}

export function DocsLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-[oklch(0.12_0_0)]">
        <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-semibold text-[15px] tracking-tight text-foreground/90 transition-colors hover:text-foreground"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.08] text-[11px] font-bold">
              L
            </div>
            Lootlog Docs
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-white/[0.06] px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold text-[15px] tracking-tight"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.08] text-[11px] font-bold">
              L
            </div>
            Lootlog Docs
          </Link>
        </header>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-b border-white/[0.06] bg-[oklch(0.12_0_0)] md:hidden">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        )}

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
