import { Button } from "@lootlog/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AppNavigationHeading } from "@/navigation/app-navigation";
import { APP_NAVIGATION_ICONS } from "@/navigation/app-navigation-icons";

type TopBarHeadingProps = {
  heading: AppNavigationHeading;
};

/**
 * The page's place in its section: the section's sidebar icon, the pages above
 * as quiet links, and the current page. A narrow bar keeps only a way back.
 */
export const TopBarHeading = ({ heading }: TopBarHeadingProps) => {
  const { t } = useTranslation();
  const { title, trail, section } = heading;
  const SectionIcon = section ? APP_NAVIGATION_ICONS[section] : null;
  const parent = trail[trail.length - 1];

  return (
    <nav
      aria-label={t("layout.navigation.breadcrumbsAriaLabel")}
      className="flex min-w-0 items-center"
    >
      {parent && (
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link to={parent.path} />}
          aria-label={t("common.actions.backTo", { page: parent.label })}
          className="shrink-0 text-muted-foreground hover:text-foreground @2xl/top-bar:hidden"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
      )}

      <ol className="flex min-w-0 items-center">
        {trail.map((page, index) => (
          <li
            key={page.path}
            className="hidden min-w-0 items-center @2xl/top-bar:flex"
          >
            <Link
              to={page.path}
              className="flex h-8 min-w-0 max-w-48 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              {index === 0 && SectionIcon && (
                <SectionIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-primary"
                />
              )}
              <span className="truncate">{page.label}</span>
            </Link>
            <span
              aria-hidden="true"
              className="mx-0.5 h-4 w-px shrink-0 rotate-[20deg] bg-foreground/20"
            />
          </li>
        ))}
        <li className="min-w-0">
          <span
            aria-current="page"
            className="flex h-8 min-w-0 items-center gap-2 px-2 text-sm font-semibold text-foreground"
          >
            {trail.length === 0 && SectionIcon && (
              <SectionIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-primary"
              />
            )}
            <span className="truncate">{title}</span>
          </span>
        </li>
      </ol>
    </nav>
  );
};
