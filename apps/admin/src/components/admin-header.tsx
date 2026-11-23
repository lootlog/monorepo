import { HorizontalMenu } from "@lootlog/ui/components/horizontal-menu";
import { PortalBrand } from "@lootlog/ui/components/portal-brand";
import { PortalNavLink } from "@lootlog/ui/components/portal-nav-link";
import { SkipLink } from "@lootlog/ui/components/skip-link";
import { Link, useRouterState } from "@tanstack/react-router";
import { text } from "@/lib/messages";

const sections = [
  { to: "/", label: text.navUsers, matches: ["/", "/users"] },
  {
    to: "/organizations",
    label: text.navOrganizations,
    matches: ["/organizations"],
  },
  { to: "/audit", label: text.navAudit, matches: ["/audit"] },
] as const;

const sectionOf = (pathname: string) =>
  sections.find(({ matches }) =>
    matches.some((match) =>
      match === "/"
        ? pathname === "/"
        : pathname === match || pathname.startsWith(`${match}/`),
    ),
  );

export function AdminHeader({ operator }: { operator: string | undefined }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const active = sectionOf(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-sidebar-border bg-sidebar/80 px-4 backdrop-blur-lg backdrop-saturate-150 opaque:bg-sidebar opaque:backdrop-blur-none md:gap-4 md:px-6">
      <SkipLink target="content">{text.skipToContent}</SkipLink>
      <PortalBrand
        home={<Link to="/" />}
        title={text.title}
        section={text.brandSection}
      />
      {operator === undefined ? null : (
        <>
          <span
            aria-hidden="true"
            className="mx-1 h-5 w-px shrink-0 bg-sidebar-border"
          />
          <HorizontalMenu
            aria-label={text.navigation}
            className="h-full min-w-0 shrink"
          >
            {sections.map((section) => (
              <li key={section.to}>
                <PortalNavLink
                  variant="bar"
                  active={section === active}
                  render={
                    <Link
                      to={section.to}
                      activeOptions={{
                        exact: section.to === "/",
                        includeSearch: false,
                      }}
                    />
                  }
                >
                  {section.label}
                </PortalNavLink>
              </li>
            ))}
          </HorizontalMenu>
          <p className="ml-auto hidden shrink-0 text-xs text-muted-foreground sm:block">
            {text.operator}: <span className="text-foreground">{operator}</span>
          </p>
        </>
      )}
    </header>
  );
}
