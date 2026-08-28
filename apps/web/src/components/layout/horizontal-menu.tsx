import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { cn } from "@lootlog/ui/lib/utils";
import { ThemeInteractiveFrame } from "@/themes/theme-interactive-frame";

interface NavElement {
  id: string;
  label: string;
  href: string;
}

interface HorizontalMenuProps {
  items: NavElement[];
  basePath?: string;
  ariaLabel?: string;
  className?: string;
}

export const HorizontalMenu: React.FC<HorizontalMenuProps> = ({
  items,
  basePath = "",
  ariaLabel = "Navigation",
  className = "",
}) => {
  const { pathname } = useLocation();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeTabRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      const el = activeTabRef.current;
      const container = scrollRef.current;
      const elLeft = el.offsetLeft;
      const elRight = elLeft + el.offsetWidth;
      const viewLeft = container.scrollLeft;
      const viewRight = viewLeft + container.clientWidth;
      if (elLeft < viewLeft || elRight > viewRight) {
        container.scrollTo({ left: elLeft - 16, behavior: "smooth" });
      }
    }
  }, [pathname]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      if (container.scrollWidth <= container.clientWidth) return;
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  const activeUrl = items.reduce<string | null>((best, item) => {
    const url = `${basePath}${item.href}`;
    if (pathname === url || pathname.startsWith(`${url}/`)) {
      if (!best || url.length > best.length) return url;
    }
    return best;
  }, null);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex w-full min-w-0 gap-2 overflow-x-auto overflow-y-hidden px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] scroll-smooth [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="navigation"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const url = `${basePath}${item.href}`;
        const active = url === activeUrl;
        const isHovered = hoveredId === item.id;

        const tabContent = (
          <span
            className={cn(
              "inline-flex items-center px-6 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              active
                ? "bg-surface-selected text-foreground font-semibold"
                : "bg-background text-muted-foreground hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {item.label}
          </span>
        );

        return (
          <Link
            key={item.id}
            to={url}
            preload="intent"
            activeOptions={{ exact: true }}
            aria-current={active ? "page" : undefined}
            className="shrink-0"
            ref={active ? activeTabRef : undefined}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <ThemeInteractiveFrame isHovered={isHovered} isActive={active}>
              {tabContent}
            </ThemeInteractiveFrame>
          </Link>
        );
      })}
    </div>
  );
};
