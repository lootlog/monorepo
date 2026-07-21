import { describe, expect, it } from "vitest";
import { createChatScrollController } from "./chat-scroll-controller";

describe("chat scroll controller", () => {
  it("keeps following new messages while a smooth programmatic scroll is in flight", () => {
    const scrollCommands: ScrollToOptions[] = [];
    const controller = createChatScrollController({
      applyScroll: (command) => scrollCommands.push(command),
      nearBottomThreshold: 100,
    });
    controller.completeInitialization();

    controller.animateToBottom({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 120,
    });
    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 120,
    });

    expect(controller.shouldFollowNewMessages()).toBe(true);
    expect(scrollCommands).toEqual([{ behavior: "smooth", top: 1_000 }]);

    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 1_000,
    });
    expect(controller.shouldFollowNewMessages()).toBe(true);
  });

  it("resumes following only at the physical bottom", () => {
    const controller = createChatScrollController({
      applyScroll: () => undefined,
      nearBottomThreshold: 100,
    });
    controller.completeInitialization();
    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 1_000,
    });
    controller.registerUserScrollIntent({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 700,
    });
    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 700,
    });

    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 940,
    });
    expect(controller.shouldFollowNewMessages()).toBe(false);

    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 1_000,
    });

    expect(controller.shouldFollowNewMessages()).toBe(true);
  });

  it("cancels an active browser animation at the exact user position", () => {
    const scrollCommands: ScrollToOptions[] = [];
    const controller = createChatScrollController({
      applyScroll: (command) => scrollCommands.push(command),
      nearBottomThreshold: 100,
    });
    controller.completeInitialization();
    controller.animateToBottom({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 400,
    });

    controller.registerUserScrollIntent({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 512,
    });

    expect(controller.getMode()).toBe("reading-history");
    expect(scrollCommands).toEqual([
      { behavior: "smooth", top: 1_000 },
      { behavior: "auto", top: 512 },
    ]);
  });
});
