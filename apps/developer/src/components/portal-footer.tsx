import {
  COMMUNITY_LINKS,
  PUBLIC_SITE_ORIGINS,
} from "@lootlog/domain/public-sites";
import { LootlogMark } from "@lootlog/ui/components/lootlog-mark";
import { portalText as t } from "@/lib/translations";

const links = [
  { href: PUBLIC_SITE_ORIGINS.web, label: t.footerProduct },
  { href: PUBLIC_SITE_ORIGINS.docs, label: t.footerUserDocs },
  { href: COMMUNITY_LINKS.github, label: t.footerGitHub },
  { href: COMMUNITY_LINKS.discord, label: t.footerDiscord },
  { href: COMMUNITY_LINKS.sdkPackage, label: t.footerNpm },
];

export function PortalFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-10">
        <p className="flex items-center gap-2.5">
          <LootlogMark className="size-5" />
          {t.footerNote}
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
