import { Button } from "@lootlog/ui/components/button";
import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

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

  return (
    <div className={`border-b box-border bg-background ${className}`}>
      <div
        ref={scrollRef}
        className="p-2 flex gap-2 overflow-x-auto md:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
        role="navigation"
        aria-label={ariaLabel}
      >
        {items.map((item) => {
          const url = `${basePath}${item.href}`;
          const active = pathname === url;
          return (
            <Link
              key={item.id}
              to={url}
              aria-current={active ? "page" : undefined}
              className="flex-shrink-0"
              ref={active ? activeTabRef : undefined}
            >
              <Button
                className="flex-shrink-0 min-w-max"
                size="sm"
                variant={active ? "default" : "ghost"}
              >
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
