import { LootlogMark } from "~/components/lootlog-mark";
import { portalText as t } from "~/lib/translations";

const links = [
  { href: "https://lootlog.pl", label: t.footerProduct },
  { href: "https://docs.lootlog.pl", label: t.footerUserDocs },
  { href: "https://github.com/lootlog/monorepo", label: t.footerGitHub },
  { href: "https://discord.gg/mPcczaeYMu", label: t.footerDiscord },
  { href: "https://www.npmjs.com/package/@lootlog/sdk", label: t.footerNpm },
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
