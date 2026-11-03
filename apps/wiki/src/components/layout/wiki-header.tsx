import { Link, useLocation } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import { findWikiSection, WIKI_NAVIGATION } from "@/navigation/wiki-navigation";
import { WikiHeaderSearch } from "./wiki-header-search";
import { WikiUserMenu } from "./wiki-user-menu";

// The home page is the logo's link; the bar lists the sections that search.
const sections = WIKI_NAVIGATION.filter(({ link }) => link.to !== "/");

/**
 * The site bar: the wiki, its sections, the search and the account. From `md`
 * it is one row; narrower screens move the sections to a second, scrolling row
 * so every label stays readable.
 */
export function WikiHeader() {
  const { pathname } = useLocation();
  const activeSection = findWikiSection(pathname);
  const mobileNavRef = useRef<HTMLElement>(null);

  // The phone row scrolls; keep the current section's tab in view.
  useEffect(() => {
    const nav = mobileNavRef.current;
    const activeLink = nav?.querySelector<HTMLElement>("[aria-current=page]");

    if (!nav || !activeLink) return;

    nav.scrollLeft =
      activeLink.offsetLeft - (nav.clientWidth - activeLink.offsetWidth) / 2;
  }, [activeSection]);

  const renderSections = (className: string) =>
    sections.map((section) => {
      const isActive = section === activeSection;
      const Icon = section.icon;

      return (
        <Link
          key={section.link.to}
          {...section.link}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-sm whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
            isActive
              ? "bg-primary/12 font-semibold text-primary"
              : "font-medium text-muted-foreground hover:bg-primary/10 hover:text-foreground",
            className,
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
          {t(section.labelKey)}
        </Link>
      );
    });

  return (
    <header className="sticky top-0 z-50 border-b border-sidebar-border bg-sidebar/80 backdrop-blur-lg backdrop-saturate-150">
      <div className="mx-auto flex h-14 w-full max-w-[100rem] items-center gap-3 px-4 md:gap-6 md:px-6">
        <Link
          to="/"
          className="flex h-10 shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <BookOpen aria-hidden="true" className="size-4" />
          </span>
          <span className="text-[0.9375rem] font-semibold tracking-tight text-foreground">
            {t("header.brand")}{" "}
            <span className="text-muted-foreground">
              {t("header.brandSuffix")}
            </span>
          </span>
        </Link>

        <nav
          aria-label={t("navigation.ariaLabel")}
          className="flex items-center gap-1 max-md:hidden"
        >
          {renderSections("")}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:min-w-0 lg:flex-1 lg:justify-end">
          <WikiHeaderSearch />
          <WikiUserMenu />
        </div>
      </div>

      <nav
        ref={mobileNavRef}
        aria-label={t("navigation.ariaLabel")}
        className="relative flex items-center gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:hidden"
      >
        {renderSections("")}
      </nav>
    </header>
  );
}
