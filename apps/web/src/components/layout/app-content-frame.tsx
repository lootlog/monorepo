import type { ReactNode } from "react";

type AppContentFrameProps = {
  header: ReactNode;
  children: ReactNode;
};

export const AppContentFrame = ({ header, children }: AppContentFrameProps) => (
  <div className="app-content-frame flex min-h-0 min-w-0 flex-1 flex-col">
    {header}
    <main
      id="main-content"
      className="flex min-h-0 min-w-0 flex-1 flex-col max-md:overflow-clip md:overflow-hidden"
    >
      {children}
    </main>
  </div>
);
