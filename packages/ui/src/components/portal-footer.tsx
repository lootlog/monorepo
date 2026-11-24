import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";
import type { ReactElement } from "react";
import {
  otherPortalSites,
  type PortalSiteId,
  type PortalSiteLabels,
} from "../lib/portal-sites";
import { LootlogMark } from "./lootlog-mark";
import { PortalSiteLink } from "./portal-site-link";
import { TextLink } from "./text-link";

type PortalFooterLink = {
  id: string;
  label: string;
  render: ReactElement;
};

type PortalFooterColumn = {
  title: string;
  links: readonly PortalFooterLink[];
};

type PortalFooterProps = {
  site: PortalSiteId;
  home: ReactElement;
  containerClassName: string;
  resources?: PortalFooterColumn;
  legalLinks: readonly PortalFooterLink[];
  labels: {
    brand: string;
    tagline: string;
    navigation: string;
    sites: string;
    community: string;
    copyright: string;
    legalNotice?: string;
    siteNames: PortalSiteLabels;
  };
};

const footerLinkClassName = "inline-flex items-center gap-1 text-sm";

export function PortalFooter({
  site,
  home,
  containerClassName,
  resources,
  legalLinks,
  labels,
}: PortalFooterProps) {
  const brand = useRender({
    render: home,
    props: {
      className:
        "inline-flex items-center gap-2.5 rounded-md text-base font-semibold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      children: (
        <>
          <LootlogMark className="size-8 shrink-0" />
          {labels.brand}
        </>
      ),
    },
  });

  const portalSiteLinks = (thirdParty: boolean) =>
    otherPortalSites(site)
      .filter((portalSite) => portalSite.thirdParty === thirdParty)
      .map((portalSite) => ({
        id: portalSite.id,
        label: labels.siteNames[portalSite.id],
        render: <PortalSiteLink site={portalSite} />,
      }));

  const columns: readonly PortalFooterColumn[] = [
    ...(resources ? [resources] : []),
    { title: labels.sites, links: portalSiteLinks(false) },
    { title: labels.community, links: portalSiteLinks(true) },
  ];

  return (
    <footer className="border-t border-sidebar-border bg-sidebar">
      <div className={cn("mx-auto w-full", containerClassName)}>
        <div className="grid gap-10 py-12 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16 lg:py-16">
          <div className="flex flex-col gap-3">
            <div>{brand}</div>
            <p className="max-w-sm text-sm/6 text-pretty text-muted-foreground">
              {labels.tagline}
            </p>
          </div>
          <nav
            aria-label={labels.navigation}
            className="grid grid-cols-2 gap-x-8 gap-y-10 sm:flex sm:gap-x-16 lg:gap-x-20"
          >
            {columns.map((column) => (
              <div key={column.title} className="flex min-w-0 flex-col gap-4">
                <h2 className="text-xs font-semibold text-foreground">
                  {column.title}
                </h2>
                <ul className="flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.id}>
                      <TextLink
                        className={footerLinkClassName}
                        render={link.render}
                      >
                        {link.label}
                      </TextLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-4 border-t border-sidebar-border py-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="flex flex-col gap-1 text-xs/5 text-muted-foreground">
            <p>{labels.copyright}</p>
            {labels.legalNotice && <p>{labels.legalNotice}</p>}
          </div>
          <ul className="flex shrink-0 gap-6">
            {legalLinks.map((link) => (
              <li key={link.id}>
                <TextLink render={link.render}>{link.label}</TextLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
