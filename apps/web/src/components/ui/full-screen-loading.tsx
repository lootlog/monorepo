import { Loader2 } from "lucide-react";

export const FullScreenLoading: React.FC = () => {
  return (
    <div className="absolute top-0 left-0 w-screen h-screen flex justify-center items-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin" />
    </div>
  );
};
