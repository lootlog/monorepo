import { useNotificationSettingsSyncStatus } from "@/hooks/use-notification-settings-sync-status";
import { AlertCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationCategoryForm } from "@/features/settings/components/notifications/notification-category-form";
import { NpcType } from "@/hooks/api/use-npcs";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@lootlog/types";
import { useEffect, useState } from "react";

const CATEGORY_TABS: { label: string; key: NotificationType }[] = [
  { label: "Elita 2", key: NpcType.ELITE2 },
  { label: "Heros", key: NpcType.HERO },
  { label: "Kolos", key: NpcType.COLOSSUS },
  { label: "Tytan", key: NpcType.TITAN },
  { label: "Komunikaty", key: "message" },
  { label: "Grupa", key: "party-gathering" },
];

const SYNC_INDICATOR_DELAY_MS = 100;

export const NotificationsSettingsTab = () => {
  const syncStatus = useNotificationSettingsSyncStatus();
  const [visibleStatus, setVisibleStatus] = useState(syncStatus.status);

  useEffect(() => {
    if (syncStatus.status === "error" || syncStatus.status === "idle") {
      setVisibleStatus(syncStatus.status);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleStatus(syncStatus.status);
    }, SYNC_INDICATOR_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [syncStatus.status]);

  return (
    <div className="ll:w-full ll:pt-2 ll:space-y-3">
      <div className="ll:space-y-1">
        <h2 className="ll:text-sm ll:font-semibold">Ustawienia powiadomień</h2>
        <p className="ll:mb-2 ll:text-gray-400">
          Skonfiguruj ustawienia powiadomień. Możesz dostosować, które typy NPC
          będą wywoływać powiadomienia oraz jak będą one prezentowane.
        </p>
      </div>
      <Tabs defaultValue={NpcType.ELITE2} className="ll:w-full ll:gap-3">
        <TabsList className="ll:flex ll:w-full ll:flex-wrap ll:justify-start ll:gap-2">
          {CATEGORY_TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {CATEGORY_TABS.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="ll:mt-0">
            <div className="ll:relative">
              <div className="ll:sticky ll:top-0 ll:z-10 ll:flex ll:h-0 ll:justify-end ll:pointer-events-none">
                <div
                  className={cn(
                    "ll:pointer-events-auto ll:-mt-1 ll:inline-flex ll:min-h-8 ll:min-w-36 ll:items-center ll:justify-center ll:gap-2 ll:rounded-sm ll:border ll:px-3 ll:py-1.5 ll:text-xs ll:font-semibold ll:leading-none ll:whitespace-nowrap ll:shadow-sm ll:transition-opacity",
                    visibleStatus === "error"
                      ? "ll:border-red-500/60 ll:bg-red-500/12 ll:text-red-200"
                      : "ll:border-gray-500 ll:bg-gray-900/95 ll:text-gray-100",
                    visibleStatus === "idle" && "ll:opacity-0 ll:invisible",
                  )}
                >
                  {visibleStatus === "error" ? (
                    <>
                      <AlertCircle className="ll:size-4" />
                      <span>Błąd synchronizacji</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="ll:size-4 ll:animate-spin" />
                      <span>
                        {visibleStatus === "saving"
                          ? "Zapisywanie..."
                          : "Synchronizowanie..."}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <NotificationCategoryForm categoryKey={tab.key} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
