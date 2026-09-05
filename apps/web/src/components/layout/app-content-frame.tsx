import type { ReactNode } from "react";

type AppContentFrameProps = {
  header: ReactNode;
  children: ReactNode;
};

export const AppContentFrame = ({ header, children }: AppContentFrameProps) => (
  <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
    {header}
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  </div>
);
