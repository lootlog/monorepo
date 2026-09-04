import { createContext, useContext, type FC } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "cn";

interface SpinnerProps {
  className?: string;
}

const SpinnerOverrideContext = createContext<FC<SpinnerProps> | null>(null);

export const SpinnerOverrideProvider: FC<{
  spinner: FC<SpinnerProps> | null;
  children: React.ReactNode;
}> = ({ spinner, children }) => {
  return (
    <SpinnerOverrideContext.Provider value={spinner}>
      {children}
    </SpinnerOverrideContext.Provider>
  );
};

export const Spinner: FC<SpinnerProps> = ({ className }) => {
  const Override = useContext(SpinnerOverrideContext);

  if (Override) {
    return <Override className={className} />;
  }

  return <Loader2 className={cn("animate-spin", className)} />;
};
