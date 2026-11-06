import { createContext, type ReactNode, useContext } from "react";
import { useNow } from "@/hooks/ui/use-now";

const TimerClockContext = createContext<number | null>(null);

export const TimerClockProvider = ({ children }: { children: ReactNode }) => {
  const epoch = useNow(1_000);

  return (
    <TimerClockContext.Provider value={epoch}>
      {children}
    </TimerClockContext.Provider>
  );
};

export const useTimerClockEpoch = () => {
  const epoch = useContext(TimerClockContext);

  if (epoch === null) {
    throw new Error("useTimerClockEpoch requires TimerClockProvider");
  }

  return epoch;
};
