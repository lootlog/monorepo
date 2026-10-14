import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import type { ReactNode, Ref } from "react";
import { SettingsTabs } from "./settings-tabs";

type SettingsTabPageProps = {
  /** Names the page for assistive technology; the tabs name it visually. */
  title: string;
  /** The page's scroll viewport, for lists that virtualize their tiles. */
  scrollRef?: Ref<HTMLDivElement>;
  children: ReactNode;
};

/**
 * A settings tab: the tabs pin under the app bar, and sticky content under
 * them, such as a list toolbar or section headings, pins below the tabs.
 */
export const SettingsTabPage = ({
  title,
  scrollRef,
  children,
}: SettingsTabPageProps) => (
  <div className="flex h-full min-h-0 flex-col">
    <h1 className="sr-only">{title}</h1>
    <ScrollArea data-under-top-bar ref={scrollRef} className="min-h-0 flex-1">
      <SettingsTabs />
      <div>{children}</div>
    </ScrollArea>
  </div>
);
