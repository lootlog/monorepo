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
    <div className="flex h-screen min-h-0 items-center justify-center bg-background backdrop-blur-xs">
      <Spinner className="size-16" />
    </div>
  );
};
