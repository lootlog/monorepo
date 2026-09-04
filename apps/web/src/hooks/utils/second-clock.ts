const secondTickListeners = new Set<(currentSecond: number) => void>();
let secondTickInterval: ReturnType<typeof setInterval> | null = null;

export const getClockSecond = () => Math.floor(Date.now() / 1000);
export const subscribeToSecondClock = (
  listener: (currentSecond: number) => void,
) => {
  secondTickListeners.add(listener);

  if (secondTickInterval === null) {
    secondTickInterval = setInterval(() => {
      const currentSecond = getClockSecond();
      [...secondTickListeners].forEach((currentListener) =>
        currentListener(currentSecond),
      );
    }, 1000);
  }

  return () => {
    secondTickListeners.delete(listener);

    if (secondTickListeners.size === 0 && secondTickInterval !== null) {
      clearInterval(secondTickInterval);
      secondTickInterval = null;
    }
  };
};
