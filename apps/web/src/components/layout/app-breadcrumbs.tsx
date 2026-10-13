import { Link } from "@tanstack/react-router";
import type { AppNavigation } from "@/navigation/app-navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@lootlog/ui/components/breadcrumb";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

type AppBreadcrumbsProps = {
  breadcrumbs: AppNavigation["breadcrumbs"];
  /** Icon of the section the trail starts in, as the sidebar shows it. */
  sectionIcon?: LucideIcon;
};

// Every crumb is a 32px chip so links light up like the controls beside them.
const BREADCRUMB_CHIP_CLASS_NAME =
  "inline-flex h-8 min-w-0 max-w-full items-center gap-2 rounded-md px-2 text-sm";

type BreadcrumbVisibility = "always" | "sm" | "xl" | "2xl";

const breadcrumbItemClassNames = {
  always: "flex min-w-0",
  sm: "hidden min-w-0 max-w-48 shrink-0 sm:inline-flex 2xl:max-w-56",
  xl: "hidden min-w-0 max-w-48 shrink-0 xl:inline-flex 2xl:max-w-56",
  "2xl": "hidden min-w-0 max-w-56 shrink-0 2xl:inline-flex",
} satisfies Record<BreadcrumbVisibility, string>;

const breadcrumbSeparatorClassNames = {
  always: "",
  sm: "hidden shrink-0 sm:block",
  xl: "hidden shrink-0 xl:block",
  "2xl": "hidden shrink-0 2xl:block",
} satisfies Record<BreadcrumbVisibility, string>;

const getBreadcrumbVisibility = (
  index: number,
  breadcrumbsCount: number,
): BreadcrumbVisibility => {
  if (index === breadcrumbsCount - 1) {
    return "always";
  }

  if (index === breadcrumbsCount - 2) {
    return "sm";
  }

  if (index === breadcrumbsCount - 3) {
    return "xl";
  }

  return "2xl";
};

export const AppBreadcrumbs = ({
  breadcrumbs,
  sectionIcon: SectionIcon,
}: AppBreadcrumbsProps) => {
  const { t } = useTranslation();

  return (
    <Breadcrumb
      aria-label={t("common.breadcrumbs.navigationLabel")}
      // Pulls the first chip's padding out so its icon sits on the content edge.
      className="min-w-0 overflow-hidden md:-ml-2"
    >
      <BreadcrumbList className="flex-nowrap gap-0.5 overflow-hidden">
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const breadcrumbPath = breadcrumb.path;
          const visibility = getBreadcrumbVisibility(index, breadcrumbs.length);

          const icon =
            index === 0 && SectionIcon ? (
              <SectionIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            ) : null;

          return (
            <Fragment
              key={`${breadcrumb.label}-${breadcrumb.path ?? "current"}`}
            >
              <BreadcrumbItem className={breadcrumbItemClassNames[visibility]}>
                {breadcrumbPath ? (
                  <Link
                    to={breadcrumbPath}
                    className={cn(
                      BREADCRUMB_CHIP_CLASS_NAME,
                      "font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    {icon}
                    <span className="truncate">{breadcrumb.label}</span>
                  </Link>
                ) : (
                  <BreadcrumbPage
                    className={cn(BREADCRUMB_CHIP_CLASS_NAME, "font-semibold")}
                  >
                    {icon}
                    <span className="truncate">{breadcrumb.label}</span>
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator
                  className={cn(
                    "text-muted-foreground/50",
                    breadcrumbSeparatorClassNames[visibility],
                  )}
                />
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
