import { Spinner } from "@lootlog/ui/components/spinner";

export const AppStartupLoading = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <Spinner className="size-16" />
    </div>
  );
};
