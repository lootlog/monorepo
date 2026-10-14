import type { ReactNode } from "react";
import { SettingsTabs } from "./settings-tabs";

/**
 * Route-level stand-in for a settings tab: the tabs, then the page's content.
 * It clips rather than hides its overflow, so the tabs pin to the document on
 * phones as they do on the loaded page.
 */
export const SettingsTabSkeleton = ({ children }: { children: ReactNode }) => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-clip">
    <SettingsTabs />
    <div>{children}</div>
  </div>
);
