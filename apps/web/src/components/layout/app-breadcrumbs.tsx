import type { AppNavigation } from "@/navigation/app-navigation";
import { ThemeInteractiveFrame } from "@/themes";
import { Button } from "@lootlog/ui/components/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@lootlog/ui/components/breadcrumb";
import { cn } from "cn";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";

type AppBreadcrumbsProps = {
  breadcrumbs: AppNavigation["breadcrumbs"];
  onNavigate: (path: string) => void;
};

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
  onNavigate,
}: AppBreadcrumbsProps) => {
  const { t } = useTranslation();
  const [hoveredBreadcrumbIndex, setHoveredBreadcrumbIndex] = useState<
    number | null
  >(null);

  return (
    <Breadcrumb
      aria-label={t("common.breadcrumbs.navigationLabel")}
      className="min-w-0 flex-1 overflow-hidden"
    >
      <BreadcrumbList className="flex-nowrap justify-center overflow-hidden">
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const breadcrumbPath = breadcrumb.path;
          const visibility = getBreadcrumbVisibility(index, breadcrumbs.length);

          return (
            <Fragment
              key={`${breadcrumb.label}-${breadcrumb.path ?? "current"}`}
            >
              <BreadcrumbItem className={breadcrumbItemClassNames[visibility]}>
                {breadcrumbPath ? (
                  <div
                    className="min-w-0 max-w-full"
                    onMouseEnter={() => setHoveredBreadcrumbIndex(index)}
                    onMouseLeave={() => setHoveredBreadcrumbIndex(null)}
                  >
                    <ThemeInteractiveFrame
                      isHovered={hoveredBreadcrumbIndex === index}
                      isActive={false}
                    >
                      <BreadcrumbLink
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigate(breadcrumbPath)}
                          />
                        }
                        className="min-h-8 max-w-full cursor-pointer truncate rounded px-1 text-xs text-muted-foreground/70 transition-colors duration-200 hover:text-foreground"
                      >
                        {breadcrumb.label}
                      </BreadcrumbLink>
                    </ThemeInteractiveFrame>
                  </div>
                ) : (
                  <BreadcrumbPage className="truncate text-sm font-bold">
                    {breadcrumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator
                  className={cn(
                    "text-muted-foreground/30",
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
