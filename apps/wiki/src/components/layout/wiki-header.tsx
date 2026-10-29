import { Link, useLocation } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import { findWikiSection, WIKI_NAVIGATION } from "@/navigation/wiki-navigation";
import { WikiHeaderSearch } from "./wiki-header-search";
import { WikiUserMenu } from "./wiki-user-menu";

// The home page is the logo's link; the bar lists the sections that search.
const sections = WIKI_NAVIGATION.filter(({ link }) => link.to !== "/");

/** The site bar: the wiki, its sections, the search and the account. */
export function WikiHeader() {
  const { pathname } = useLocation();
  const activeSection = findWikiSection(pathname);

  return (
    <header className="sticky top-0 z-50 border-b border-sidebar-border bg-sidebar/80 backdrop-blur-lg backdrop-saturate-150">
      <div className="mx-auto flex h-14 w-full max-w-[100rem] items-center gap-2 px-4 md:gap-4 md:px-6">
        <Link
          to="/"
          aria-label={t("meta.title")}
          className="flex h-10 shrink-0 items-center gap-2.5 rounded-md text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/12 text-primary">
            <BookOpen aria-hidden="true" className="size-4" />
          </span>
          <span className="max-md:hidden">{t("meta.title")}</span>
        </Link>

        <nav
          aria-label={t("navigation.ariaLabel")}
          className="flex shrink-0 items-center"
        >
          {sections.map((section) => {
            const isActive = section === activeSection;
            const Icon = section.icon;

            return (
              <Link
                key={section.link.to}
                {...section.link}
                aria-current={isActive ? "page" : undefined}
                aria-label={t(section.labelKey)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-2 rounded-md px-2.5 text-sm whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                  isActive
                    ? "bg-primary/12 font-semibold text-primary"
                    : "font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                <span className="max-sm:hidden">{t(section.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <WikiHeaderSearch className="ml-auto w-full max-w-xl" />
        <WikiUserMenu />
      </div>
    </header>
  );
}
