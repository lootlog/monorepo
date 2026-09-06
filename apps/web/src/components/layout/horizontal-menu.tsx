import { Link, useLocation, type LinkProps } from "@tanstack/react-router";
import { HorizontalMenu as HorizontalMenuRoot } from "@lootlog/ui/components/horizontal-menu";
import { cn } from "cn";

type NavElement = {
  id: string;
  label: string;
  href: string;
  search?: LinkProps["search"];
};

type HorizontalMenuProps = {
  items: NavElement[];
  basePath?: string;
  activeId?: string;
  ariaLabel: string;
  className?: string;
};

export const HorizontalMenu = ({
  items,
  basePath = "",
  activeId,
  ariaLabel,
  className,
}: HorizontalMenuProps) => {
  const pathname = useLocation({ select: (location) => location.pathname });
  const activeUrl = items.reduce<string | null>((best, item) => {
    const url = `${basePath}${item.href}`;
    if (pathname === url || pathname.startsWith(`${url}/`)) {
      if (!best || url.length > best.length) return url;
    }
    return best;
  }, null);

  return (
    <HorizontalMenuRoot
      aria-label={ariaLabel}
      className={cn("min-w-0 shrink-0 p-3", className)}
    >
      {items.map((item) => {
        const url = `${basePath}${item.href}`;
        const active =
          activeId === undefined ? url === activeUrl : item.id === activeId;
        return (
          <li key={item.id} className="min-w-0 max-w-full">
            <Link
              to={url}
              search={item.search}
              preload="intent"
              activeOptions={{ exact: true }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block text-sm font-medium break-words outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </HorizontalMenuRoot>
  );
};
