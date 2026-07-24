export type ChatScrollMode =
  | "initializing"
  | "following-bottom"
  | "animating-to-bottom"
  | "reading-history"
  | "jumping-to-message";

export type ChatScrollSnapshot = {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
};

type ChatScrollCommand = {
  behavior: ScrollBehavior;
  top: number;
};

export type ChatScrollController = {
  animateToBottom: (snapshot: ChatScrollSnapshot) => void;
  completeInitialization: () => void;
  getMode: () => ChatScrollMode;
  jumpToMessage: (snapshot: ChatScrollSnapshot, top: number) => void;
  observe: (snapshot: ChatScrollSnapshot) => void;
  pinToBottom: (snapshot: ChatScrollSnapshot) => void;
  registerUserScrollIntent: (snapshot: ChatScrollSnapshot) => void;
  requestFollowBottom: () => void;
  setApplyScroll: (applyScroll: (command: ChatScrollCommand) => void) => void;
  shouldFollowNewMessages: () => boolean;
};

const getMaximumScrollTop = (snapshot: ChatScrollSnapshot) =>
  Math.max(snapshot.scrollHeight - snapshot.clientHeight, 0);

export const createChatScrollController = ({
  applyScroll,
  nearBottomThreshold,
}: {
  applyScroll: (command: ChatScrollCommand) => void;
  nearBottomThreshold: number;
}): ChatScrollController => {
  let applyScrollCommand = applyScroll;
  let mode: ChatScrollMode = "initializing";
  let programmaticTarget: number | null = null;

  const scroll = (
    snapshot: ChatScrollSnapshot,
    behavior: ScrollBehavior,
    top: number,
  ) => {
    const maximumScrollTop = getMaximumScrollTop(snapshot);
    const target = Math.min(Math.max(top, 0), maximumScrollTop);
    programmaticTarget = target;
    applyScrollCommand({ behavior, top: target });
  };

  return {
    animateToBottom: (snapshot) => {
      mode = "animating-to-bottom";
      scroll(snapshot, "smooth", snapshot.scrollHeight);
    },
    completeInitialization: () => {
      if (mode === "initializing") mode = "following-bottom";
    },
    getMode: () => mode,
    jumpToMessage: (snapshot, top) => {
      mode = "jumping-to-message";
      scroll(snapshot, "smooth", top);
    },
    observe: (snapshot) => {
      const distanceFromBottom =
        snapshot.scrollHeight - (snapshot.scrollTop + snapshot.clientHeight);

      if (programmaticTarget !== null) {
        if (Math.abs(snapshot.scrollTop - programmaticTarget) <= 1) {
          programmaticTarget = null;
          if (mode === "animating-to-bottom") {
            mode = "following-bottom";
          } else if (mode === "jumping-to-message") {
            mode = "reading-history";
          }
        }
        return;
      }

      if (mode === "reading-history") {
        if (distanceFromBottom <= 1) {
          mode = "following-bottom";
        }
        return;
      }

      if (
        mode === "following-bottom" &&
        distanceFromBottom > nearBottomThreshold
      ) {
        mode = "reading-history";
      }
    },
    pinToBottom: (snapshot) => {
      const maximumScrollTop = getMaximumScrollTop(snapshot);
      if (Math.abs(snapshot.scrollTop - maximumScrollTop) <= 1) {
        programmaticTarget = null;
        return;
      }

      scroll(snapshot, "auto", snapshot.scrollHeight);
    },
    registerUserScrollIntent: (snapshot) => {
      mode = "reading-history";
      programmaticTarget = null;
      scroll(snapshot, "auto", snapshot.scrollTop);
      programmaticTarget = null;
    },
    requestFollowBottom: () => {
      mode = "following-bottom";
      programmaticTarget = null;
    },
    setApplyScroll: (nextApplyScroll) => {
      applyScrollCommand = nextApplyScroll;
    },
    shouldFollowNewMessages: () =>
      mode === "initializing" ||
      mode === "following-bottom" ||
      mode === "animating-to-bottom",
  };
};
