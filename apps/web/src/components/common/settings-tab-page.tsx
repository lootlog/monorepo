import type { ReactNode } from "react";

type SettingsTabPageProps = {
  title: string;
  children: ReactNode;
};

export const SettingsTabPage = ({ title, children }: SettingsTabPageProps) => (
  <>
    <h1 className="sr-only">{title}</h1>
    {children}
  </>
);
