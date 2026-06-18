export type BattleSideCardScrollHandoffInput = {
  altKey?: boolean;
  ctrlKey?: boolean;
  deltaX: number;
  deltaY: number;
  metaKey?: boolean;
  outerClientHeight: number;
  outerScrollHeight: number;
  outerScrollTop: number;
  shiftKey?: boolean;
};

export type BattleSideCardScrollHandoffResult = {
  shouldCapture: boolean;
  innerScrollDelta: number;
  outerScrollDelta: number;
};

const SCROLL_BOTTOM_EPSILON = 1;

export const getBattleSideCardScrollHandoff = ({
  altKey = false,
  ctrlKey = false,
  deltaX,
  deltaY,
  metaKey = false,
  outerClientHeight,
  outerScrollHeight,
  outerScrollTop,
  shiftKey = false,
}: BattleSideCardScrollHandoffInput): BattleSideCardScrollHandoffResult => {
  if (deltaY <= 0) {
    return {
      shouldCapture: false,
      innerScrollDelta: 0,
      outerScrollDelta: 0,
    };
  }

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return {
      shouldCapture: false,
      innerScrollDelta: 0,
      outerScrollDelta: 0,
    };
  }

  if (altKey || ctrlKey || metaKey || shiftKey) {
    return {
      shouldCapture: false,
      innerScrollDelta: 0,
      outerScrollDelta: 0,
    };
  }

  const remainingOuterScroll = Math.max(
    0,
    outerScrollHeight - outerClientHeight - outerScrollTop,
  );

  if (remainingOuterScroll <= SCROLL_BOTTOM_EPSILON) {
    return {
      shouldCapture: false,
      innerScrollDelta: 0,
      outerScrollDelta: 0,
    };
  }

  const outerScrollDelta = Math.min(deltaY, remainingOuterScroll);

  return {
    shouldCapture: true,
    innerScrollDelta: Math.max(0, deltaY - outerScrollDelta),
    outerScrollDelta,
  };
};
