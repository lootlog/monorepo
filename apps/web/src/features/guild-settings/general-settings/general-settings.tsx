import { GeneralSettingsForm } from "@/features/guild-settings/general-settings/general-settings-form";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import { Settings } from "lucide-react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";

const GeneralSettingsHeader = () => (
  <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="p-2 rounded-lg bg-primary/10">
        <Settings className="size-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold leading-tight">
          Ustawienia ogólne
        </h2>
        <p className="text-xs text-muted-foreground leading-tight">
          Zarządzaj konfiguracją lootloga
        </p>
      </div>
    </div>
  </div>
);

export const GeneralSettings = () => {
  const { data: guild } = useGuild({});

  return (
    <div className="flex flex-col h-full min-h-0">
      <GeneralSettingsHeader />
      <ScrollArea className="flex-1 min-h-0 bg-background/50">
        {guild && <GeneralSettingsForm />}
      </ScrollArea>
    </div>
  );
};
