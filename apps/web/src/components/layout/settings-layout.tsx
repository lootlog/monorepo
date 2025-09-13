import { PageHeader } from "@/components/layout/page-header";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { useGuildId } from "@/hooks/use-guild-id";
import { Button } from "@lootlog/ui/components/button";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";

const NAV_ELEMENTS = [
  {
    id: "general",
    label: "Ogólne",
    href: "/settings",
  },
  {
    id: "roles",
    label: "Role",
    href: "/settings/roles",
  },
  {
    id: "lootlog",
    label: "Ustawienia potworów i NPC",
    href: "/settings/npcs",
  },
  {
    id: "members",
    label: "Członkowie",
    href: "/settings/members",
  },
];

export const SettingsLayout: React.FC = () => {
  const guildId = useGuildId();
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
    <div className="flex flex-row w-full h-full min-h-0">
      <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
        <PageHeader>
          <div className="flex flex-row gap-2">
            <SidebarTrigger />
            <h1 className="font-semibold p-0">Ustawienia</h1>
          </div>
        </PageHeader>
        <div className="border-b box-border">
          <div
            ref={scrollRef}
            className="p-2 flex gap-2 overflow-x-auto md:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
            role="navigation"
            aria-label="Ustawienia"
          >
            {NAV_ELEMENTS.map((navElement) => {
              const url = `/${guildId}${navElement.href}`;
              const active = pathname === url;
              return (
                <Link
                  key={navElement.id}
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
                    {navElement.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex-1 min-h-0 flex">
          <ScrollArea className="flex w-full flex-1 min-h-0">
            <div className="w-full flex flex-col gap-0 pb-4 md:pb-6">
              <Outlet />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
