import type { ReactNode } from "react";

type AppContentFrameProps = {
  header: ReactNode;
  children: ReactNode;
};

export const AppContentFrame = ({ header, children }: AppContentFrameProps) => (
  <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
    {header}
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
    >
      {children}
    </main>
  </div>
);
