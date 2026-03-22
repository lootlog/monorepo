import { Spinner } from "@lootlog/ui/components/spinner";

export const FullScreenLoading: React.FC = () => {
  return (
    <div className="absolute top-0 left-0 w-dvw h-dvh flex justify-center items-center bg-background">
      <Spinner className="h-16 w-16" />
    </div>
  );
};
