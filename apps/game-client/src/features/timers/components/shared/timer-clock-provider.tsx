import { createContext, type ReactNode, useContext } from "react";
import { useTimersUpdate } from "@/features/timers/hooks/use-timers-update";

const TimerClockContext = createContext<number | null>(null);

export const TimerClockProvider = ({ children }: { children: ReactNode }) => {
  const epoch = useTimersUpdate();

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
