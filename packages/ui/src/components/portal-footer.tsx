import { useRender } from "@base-ui/react/use-render";
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

type PortalFooterProps = {
  site: PortalSiteId;
  home: ReactElement;
  links?: readonly PortalFooterLink[];
  legalLinks: readonly PortalFooterLink[];
  labels: {
    brand: string;
    tagline: string;
    navigation: string;
    copyright: string;
    legalNotice?: string;
    siteNames: PortalSiteLabels;
  };
};

const footerLinkClassName = "inline-flex items-center gap-1 text-sm";

export function PortalFooter({
  site,
  home,
  links = [],
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

  return (
    <footer className="border-t border-sidebar-border bg-sidebar">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="flex flex-col gap-3">
            <div>{brand}</div>
            <p className="max-w-md text-sm/6 text-pretty text-muted-foreground">
              {labels.tagline}
            </p>
          </div>
          <nav aria-label={labels.navigation}>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {links.map((link) => (
                <li key={link.id}>
                  <TextLink
                    className={footerLinkClassName}
                    render={link.render}
                  >
                    {link.label}
                  </TextLink>
                </li>
              ))}
              {otherPortalSites(site).map((portalSite) => (
                <li key={portalSite.id}>
                  <TextLink
                    className={footerLinkClassName}
                    render={<PortalSiteLink site={portalSite} />}
                  >
                    {labels.siteNames[portalSite.id]}
                  </TextLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex flex-col gap-3 border-t border-sidebar-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{labels.copyright}</p>
          <ul className="flex gap-6">
            {legalLinks.map((link) => (
              <li key={link.id}>
                <TextLink render={link.render}>{link.label}</TextLink>
              </li>
            ))}
          </ul>
        </div>
        {labels.legalNotice && (
          <p className="-mt-5 text-xs/5 text-muted-foreground">
            {labels.legalNotice}
          </p>
        )}
      </div>
    </footer>
  );
}
