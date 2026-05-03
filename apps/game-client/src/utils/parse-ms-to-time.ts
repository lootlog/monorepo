export const parseMsToTime = (time: number) => {
  const sign = time < 0 ? "-" : "";
  const absoluteTime = Math.abs(time);
  const hours = Math.floor(absoluteTime / (1000 * 60 * 60));
  const minutes = Math.floor((absoluteTime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absoluteTime % (1000 * 60)) / 1000);

  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}:${String(seconds).padStart(2, "0")}`;
};
