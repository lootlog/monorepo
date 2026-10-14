import type { ReactNode } from "react";

type SettingsTabPageProps = {
  /** Names the page for assistive technology; the tabs name it visually. */
  title: string;
  children: ReactNode;
};

/**
 * A settings tab's content, rendered under the tabs in the settings layout's
 * page scroller, so sticky content such as a list toolbar or section headings
 * pins below the tabs.
 */
export const SettingsTabPage = ({ title, children }: SettingsTabPageProps) => (
  <>
    <h1 className="sr-only">{title}</h1>
    {children}
  </>
);
