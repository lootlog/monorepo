import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FC } from "react";
import { TimersSettingsAppearance } from "@/features/settings/components/timers/timers-settings-appearance";
import { TimersSettingsGeneral } from "@/features/settings/components/timers/timers-settings-general";
import { TimersSettingsColors } from "@/features/settings/components/timers/timers-settings-colors";

export const TimersSettingsTab: FC = () => {
  return (
    <span className="ll:w-full ll:pt-2 ll:flex ll:flex-col ll:gap-4">
      <span>
        <h2 className="ll:text-sm">Ustawienia timerów</h2>
        <p className=" ll:text-muted-foreground">
          Skonfiguruj ustawienia dotyczące wyświetlania i działania timerów.
        </p>
      </span>
      <Tabs
        defaultValue="general"
        className="ll:w-full ll:h-full ll:flex ll:flex-col ll:gap-2 ll:pb-4"
      >
        <TabsList>
          <TabsTrigger value="general">Ogólne</TabsTrigger>
          <TabsTrigger value="appearance">Wygląd</TabsTrigger>
          <TabsTrigger value="colors">Kolory</TabsTrigger>
        </TabsList>
        <TabsContent
          value="general"
          className="ll:pt-2 ll:rounded-md ll:shadow-sm ll:grow ll:pr-1"
        >
          <TimersSettingsGeneral />
        </TabsContent>
        <TabsContent
          value="appearance"
          className="ll:pt-2 ll:rounded-md ll:shadow-sm ll:grow ll:pr-1"
        >
          <TimersSettingsAppearance />
        </TabsContent>
        <TabsContent
          value="colors"
          className="ll:pt-2 ll:rounded-md ll:shadow-sm ll:grow ll:pr-1"
        >
          <TimersSettingsColors />
        </TabsContent>
      </Tabs>
    </span>
  );
};
