import { Spinner } from "@lootlog/ui/components/spinner";

export const FullScreenLoading: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Spinner className="h-16 w-16" />
    </div>
  );
};
