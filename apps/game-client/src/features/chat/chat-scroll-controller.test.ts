import { describe, expect, it } from "vitest";
import { createChatScrollController } from "./chat-scroll-controller";

describe("chat scroll controller", () => {
  it("pins to the bottom without starting an animation", () => {
    const scrollCommands: ScrollToOptions[] = [];
    const controller = createChatScrollController({
      applyScroll: (command) => scrollCommands.push(command),
      nearBottomThreshold: 72,
    });
    controller.completeInitialization();

    controller.pinToBottom({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 120,
    });

    expect(controller.shouldFollowNewMessages()).toBe(true);
    expect(scrollCommands).toEqual([{ behavior: "auto", top: 1_000 }]);

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
      nearBottomThreshold: 72,
    });
    controller.completeInitialization();
    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 1_000,
    });
    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 928,
    });
    expect(controller.shouldFollowNewMessages()).toBe(true);

    controller.registerUserScrollIntent({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 927,
    });
    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 927,
    });
    expect(controller.shouldFollowNewMessages()).toBe(false);

    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 997,
    });
    expect(controller.shouldFollowNewMessages()).toBe(false);

    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 998,
    });

    expect(controller.shouldFollowNewMessages()).toBe(true);
  });

  it("keeps the exact user position after leaving the bottom", () => {
    const scrollCommands: ScrollToOptions[] = [];
    const controller = createChatScrollController({
      applyScroll: (command) => scrollCommands.push(command),
      nearBottomThreshold: 72,
    });
    controller.completeInitialization();
    controller.pinToBottom({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 400,
    });

    controller.registerUserScrollIntent({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 512,
    });
    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 512,
    });

    expect(controller.getMode()).toBe("reading-history");
    expect(scrollCommands).toEqual([{ behavior: "auto", top: 1_000 }]);
  });

  it("preserves a history position without changing it into an animated scroll", () => {
    const scrollCommands: ScrollToOptions[] = [];
    const controller = createChatScrollController({
      applyScroll: (command) => scrollCommands.push(command),
      nearBottomThreshold: 72,
    });
    controller.completeInitialization();
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
    scrollCommands.length = 0;

    controller.preservePosition(
      {
        clientHeight: 300,
        scrollHeight: 900,
        scrollTop: 700,
      },
      420,
    );

    expect(controller.getMode()).toBe("reading-history");
    expect(scrollCommands).toEqual([{ behavior: "auto", top: 420 }]);
  });

  it("expires a missed programmatic target on the next scroll event", () => {
    const controller = createChatScrollController({
      applyScroll: () => undefined,
      nearBottomThreshold: 72,
    });
    controller.completeInitialization();
    controller.pinToBottom({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 400,
    });

    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 990,
    });
    controller.registerUserScrollIntent({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 800,
    });
    controller.observe({
      clientHeight: 300,
      scrollHeight: 1_300,
      scrollTop: 800,
    });

    expect(controller.getMode()).toBe("reading-history");
  });
});
