import { Link, type LinkOptions } from "@tanstack/react-router";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@lootlog/ui/components/breadcrumb";
import { t } from "@/i18n/messages";

export type PageBreadcrumb = { label: string; link?: LinkOptions };

/** Where an article sits in the wiki, from the home page to itself. */
export function PageBreadcrumbs({
  items,
}: {
  items: readonly PageBreadcrumb[];
}) {
  const trail: readonly PageBreadcrumb[] = [
    { label: t("navigation.home"), link: { to: "/" } },
    ...items,
  ];

  return (
    <Breadcrumb aria-label={t("navigation.breadcrumbs")}>
      <BreadcrumbList className="text-xs">
        {trail.map(({ label, link }, index) => (
          <Fragment key={`${index}-${label}`}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {link && index < trail.length - 1 ? (
                <BreadcrumbLink render={<Link {...link} />}>
                  {label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="text-muted-foreground">
                  {label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
