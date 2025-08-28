import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FC } from "react";
import { TimersSettingsAppearance } from "@/features/settings/components/timers/timers-settings-appearance";
import { TimersSettingsGeneral } from "@/features/settings/components/timers/timers-settings-general";

export const TimersSettingsTab: FC = () => {
  return (
    <span className="ll-w-full ll-pt-2 ll-flex ll-flex-col ll-gap-4">
      <span>
        <h2 className="ll-text-sm">Ustawienia timerów</h2>
        <p className=" ll-text-muted-foreground">
          Skonfiguruj ustawienia dotyczące wyświetlania i działania timerów.
        </p>
      </span>
      <Tabs
        defaultValue="general"
        className="ll-w-full ll-h-full ll-flex ll-flex-col ll-gap-2"
      >
        <TabsList>
          <TabsTrigger value="general">Ogólne</TabsTrigger>
          <TabsTrigger value="appearance">Wygląd</TabsTrigger>
        </TabsList>
        <TabsContent
          value="general"
          className="ll-p-3 ll-bg-muted/40 ll-rounded-md ll-border ll-border-solid ll-border-accent-foreground/40 ll-shadow-sm ll-flex-grow"
        >
          <TimersSettingsGeneral />
        </TabsContent>
        <TabsContent
          value="appearance"
          className="ll-p-3 ll-bg-muted/40 ll-rounded-md ll-border ll-border-solid ll-border-accent-foreground/40 ll-shadow-sm ll-flex-grow"
        >
          <TimersSettingsAppearance />
        </TabsContent>
      </Tabs>
    </span>
  );
};
