import { useEffect, useState } from "react";

export const useMinuteTimestamp = () => {
  const [timestamp, setTimestamp] = useState(Date.now);
  useEffect(() => {
    const interval = window.setInterval(() => setTimestamp(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  return timestamp;
};
