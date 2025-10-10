import { PageHeader } from "@/components/layout/page-header";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";

export const BattlePanelLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Get battle data if we're on a single battle page
  const { battleId } = params;

  useEffect(() => {
    // Scroll to top when location changes (navigation between battle pages)
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        viewport.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [location.pathname]);

  // Determine current page and navigation structure
  const getNavigationInfo = () => {
    const path = location.pathname;

    if (path === "/@me/battle-panel" || path === "/@me/battle-panel/stats") {
      return {
        breadcrumbs: [{ label: "Panel walk", path: null }],
        showBack: false,
      };
    }

    if (path === "/@me/battle-panel/battles") {
      return {
        breadcrumbs: [
          { label: "Panel walk", path: "/@me/battle-panel" },
          { label: "Walki", path: null },
        ],
        showBack: true,
        backPath: "/@me/battle-panel",
      };
    }

    if (path.startsWith("/@me/battle-panel/battles/") && battleId) {
      return {
        breadcrumbs: [
          { label: "Panel walk", path: "/@me/battle-panel" },
          { label: "Walki", path: "/@me/battle-panel/battles" },
          { label: `Walka #${battleId}`, path: null },
        ],
        showBack: true,
        backPath: "/@me/battle-panel/battles",
      };
    }

    return {
      breadcrumbs: [{ label: "Panel walk", path: null }],
      showBack: false,
    };
  };

  const navInfo = getNavigationInfo();

  return (
    <div className="flex flex-row w-full h-full min-h-0">
      <div className="w-full h-full flex flex-col min-h-0">
        <PageHeader>
          <div className="flex flex-row gap-2 items-center justify-between w-full">
            <div className="flex flex-row gap-2 items-center">
              <SidebarTrigger />
              {navInfo.showBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(navInfo.backPath!)}
                  className="p-1 h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1 text-sm flex-1 min-w-0 justify-center overflow-hidden">
              {navInfo.breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-1 min-w-0 shrink-0 last:shrink">
                  {crumb.path ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(crumb.path!)}
                      className="text-sm h-auto p-1 font-semibold hover:bg-accent/50 whitespace-nowrap"
                    >
                      {crumb.label}
                    </Button>
                  ) : (
                    <span className="font-semibold px-1 truncate">{crumb.label}</span>
                  )}
                  {index < navInfo.breadcrumbs.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <div className="w-8" />
          </div>
        </PageHeader>
        <ScrollArea
          ref={scrollAreaRef}
          className="flex-1 min-h-0 flex flex-col gap-4 w-full max-w-full h-full"
        >
          <div className="h-full">
            <Outlet />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
