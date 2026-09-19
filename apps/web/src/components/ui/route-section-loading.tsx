import { useEffect, useState } from "react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { AppStartupLoading } from "@/components/ui/app-startup-loading";

let isInitialLoad = true;

export const RouteSectionLoading = () => {
  const [isStartup] = useState(() => isInitialLoad);

  useEffect(() => {
    isInitialLoad = false;
  }, []);

  if (isStartup) {
    return <AppStartupLoading />;
  }

  return (
    // Fills the shell's content area; outside a shell nothing bounds it, so it
    // falls back to the viewport height.
    <div className="flex h-dvh max-h-full min-h-0 w-full animate-placeholder-in items-center justify-center">
      <Spinner className="size-16" />
    </div>
  );
};
