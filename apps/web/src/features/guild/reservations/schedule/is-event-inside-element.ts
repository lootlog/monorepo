const getEventClientPoint = (
  event: Event,
): { clientX: number; clientY: number } | null => {
  if (event instanceof MouseEvent) {
    return { clientX: event.clientX, clientY: event.clientY };
  }
  if (!(event instanceof TouchEvent)) return null;
  const touch = event.touches[0] ?? event.changedTouches[0];
  if (!touch) return null;
  return { clientX: touch.clientX, clientY: touch.clientY };
};

export const isEventInsideElement = (
  event: Event,
  element: Element,
): boolean => {
  const point = getEventClientPoint(event);
  if (!point) return false;
  const rect = element.getBoundingClientRect();
  return (
    point.clientX >= rect.left &&
    point.clientX <= rect.right &&
    point.clientY >= rect.top &&
    point.clientY <= rect.bottom
  );
};
