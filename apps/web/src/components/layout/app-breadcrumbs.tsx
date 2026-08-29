import type { NavigationInfo } from "@/components/layout/get-navigation-info";
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
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";

type AppBreadcrumbsProps = {
  breadcrumbs: NavigationInfo["breadcrumbs"];
  onNavigate: (path: string) => void;
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

          return (
            <Fragment
              key={`${breadcrumb.label}-${breadcrumb.path ?? "current"}`}
            >
              <BreadcrumbItem className="min-w-0 shrink-0 last:shrink">
                {breadcrumbPath ? (
                  <div
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
                        className="min-h-8 cursor-pointer whitespace-nowrap rounded px-1 text-xs text-muted-foreground/70 transition-colors duration-200 hover:text-foreground"
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
                <BreadcrumbSeparator className="text-muted-foreground/30" />
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
