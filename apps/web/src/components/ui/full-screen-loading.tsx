import { LoadingSlot } from "@/components/common/loading-slot";

export const FullScreenLoading: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
      <LoadingSlot />
    </div>
  );
};
