import { Button } from "@lootlog/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import type { AppNavigationHeading } from "@/navigation/app-navigation";
import { APP_NAVIGATION_ICONS } from "@/navigation/app-navigation-icons";

type TopBarHeadingProps = {
  heading: AppNavigationHeading;
  /** Where a page renders its own title, such as an editable one. */
  titleRef: Ref<HTMLDivElement>;
};

/**
 * The page's place in its section: the section's sidebar icon, the pages above
 * as quiet links, and the current page. A narrow bar keeps only a way back.
 * A page may replace the current page's label through the title slot.
 */
export const TopBarHeading = ({ heading, titleRef }: TopBarHeadingProps) => {
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
          render={<Link to={parent.path} search={parent.search} />}
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
              search={page.search}
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
        <li className="flex min-w-0 items-center">
          <div ref={titleRef} className="peer flex min-w-0 empty:hidden" />
          <span
            aria-current="page"
            className="flex h-8 min-w-0 items-center gap-2 px-2 text-sm font-semibold text-foreground peer-[:not(:empty)]:hidden"
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
