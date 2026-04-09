import { Spinner } from "@lootlog/ui/components/spinner";

export const RouteSectionLoading = () => {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-background/50">
      <Spinner className="h-7 w-7" />
    </div>
  );
};
