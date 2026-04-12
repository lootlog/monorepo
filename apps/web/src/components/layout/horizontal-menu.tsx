import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/hooks/context/use-theme";
import { FrozenButton } from "@/components/effects/rukia-frost";
import { cn } from "@lootlog/ui/lib/utils";

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
  const { theme } = useTheme();
  const isRukiaTheme = theme === "rukia";
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
        "px-3 py-3 flex gap-2 overflow-x-auto md:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth",
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
                ? isRukiaTheme
                  ? "bg-primary/15 text-white font-semibold"
                  : "bg-primary/15 text-primary"
                : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50",
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
            aria-current={active ? "page" : undefined}
            className="flex-shrink-0"
            ref={active ? activeTabRef : undefined}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {isRukiaTheme ? (
              <FrozenButton isHovered={isHovered} isActive={active}>
                {tabContent}
              </FrozenButton>
            ) : (
              tabContent
            )}
          </Link>
        );
      })}
    </div>
  );
};
