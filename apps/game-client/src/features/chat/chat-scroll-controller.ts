export type ChatScrollMode =
  | "initializing"
  | "following-bottom"
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
  completeInitialization: () => void;
  expireProgrammaticTarget: () => void;
  getMode: () => ChatScrollMode;
  jumpToMessage: (snapshot: ChatScrollSnapshot, top: number) => void;
  observe: (snapshot: ChatScrollSnapshot) => void;
  pinToBottom: (snapshot: ChatScrollSnapshot) => void;
  preservePosition: (snapshot: ChatScrollSnapshot, top: number) => void;
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
  let userScrollIntentPending = false;

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
    completeInitialization: () => {
      if (mode === "initializing") mode = "following-bottom";
    },
    expireProgrammaticTarget: () => {
      programmaticTarget = null;
    },
    getMode: () => mode,
    jumpToMessage: (snapshot, top) => {
      mode = "jumping-to-message";
      scroll(snapshot, "smooth", top);
    },
    observe: (snapshot) => {
      const distanceFromBottom =
        snapshot.scrollHeight - (snapshot.scrollTop + snapshot.clientHeight);
      let missedProgrammaticTarget = false;

      if (programmaticTarget !== null) {
        const reachedProgrammaticTarget =
          Math.abs(snapshot.scrollTop - programmaticTarget) <= 1;
        programmaticTarget = null;
        missedProgrammaticTarget = !reachedProgrammaticTarget;

        if (mode === "jumping-to-message") {
          mode = "reading-history";
        }
        if (reachedProgrammaticTarget) {
          userScrollIntentPending = false;
          return;
        }
      }

      if (mode === "reading-history") {
        if (distanceFromBottom <= 2) {
          mode = "following-bottom";
        }
        userScrollIntentPending = false;
        return;
      }

      if (
        mode === "following-bottom" &&
        (userScrollIntentPending || missedProgrammaticTarget) &&
        distanceFromBottom > nearBottomThreshold
      ) {
        mode = "reading-history";
        userScrollIntentPending = false;
        return;
      }
      userScrollIntentPending =
        userScrollIntentPending && distanceFromBottom > 2;
    },
    pinToBottom: (snapshot) => {
      const maximumScrollTop = getMaximumScrollTop(snapshot);
      if (Math.abs(snapshot.scrollTop - maximumScrollTop) <= 1) {
        programmaticTarget = null;
        return;
      }

      scroll(snapshot, "auto", snapshot.scrollHeight);
    },
    preservePosition: (snapshot, top) => {
      scroll(snapshot, "auto", top);
    },
    registerUserScrollIntent: (_snapshot) => {
      userScrollIntentPending = true;
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
      mode === "initializing" || mode === "following-bottom",
  };
};
