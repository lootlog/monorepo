// @vitest-environment happy-dom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { startContentEntrance } from "./content-entrance";

const flushMutations = () => new Promise((resolve) => setTimeout(resolve));

const revealPlaceholder = (placeholder: Element) => {
  placeholder.dispatchEvent(
    new AnimationEvent("animationstart", {
      animationName: "placeholder-in",
      bubbles: true,
    }),
  );
};

const mountSection = () => {
  const root = document.createElement("div");
  const section = document.createElement("section");
  const placeholder = document.createElement("div");

  section.append(placeholder);
  root.append(section);
  document.body.append(root);
  startContentEntrance(root);

  return { placeholder, section };
};

describe("content entrance", () => {
  let animate: MockInstance<HTMLElement["animate"]>;

  beforeEach(() => {
    animate = vi
      .spyOn(HTMLElement.prototype, "animate")
      .mockReturnValue(new Animation());
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const animatedProperties = () =>
    animate.mock.calls.map(([keyframes], index) => [
      animate.mock.contexts[index],
      Array.isArray(keyframes)
        ? Object.keys(keyframes[0] ?? {}).find((key) => key !== "offset")
        : undefined,
    ]);

  it("fades in content that replaces a placeholder the player saw", async () => {
    const { placeholder, section } = mountSection();
    const content = document.createElement("article");

    revealPlaceholder(placeholder);
    placeholder.replaceWith(content);
    await flushMutations();

    expect(animatedProperties()).toEqual([
      [content, "opacity"],
      [content, "transform"],
    ]);
    expect(section.contains(content)).toBe(true);
  });

  it("lifts the blocks beside a floating button, never the button's container", async () => {
    const { placeholder } = mountSection();
    const content = document.createElement("article");
    const floatingButton = document.createElement("button");

    const list = document.createElement("ul");

    floatingButton.className = "fixed bottom-4 right-4";
    content.append(list, floatingButton);
    revealPlaceholder(placeholder);
    placeholder.replaceWith(content);
    await flushMutations();

    expect(animatedProperties()).toEqual([
      [content, "opacity"],
      [list, "transform"],
    ]);
  });

  it("shows content at once when its placeholder never became visible", async () => {
    const { placeholder } = mountSection();

    placeholder.replaceWith(document.createElement("article"));
    await flushMutations();

    expect(animate).not.toHaveBeenCalled();
  });

  it("leaves content elsewhere alone while a placeholder is still loading", async () => {
    const { placeholder, section } = mountSection();

    revealPlaceholder(placeholder);
    section.before(document.createElement("aside"));
    await flushMutations();

    expect(animate).not.toHaveBeenCalled();
  });

  it("shows content at once when the player prefers reduced motion", async () => {
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({
          addEventListener: vi.fn(),
          addListener: vi.fn(),
          dispatchEvent: vi.fn(() => true),
          matches: true,
          media: query,
          onchange: null,
          removeEventListener: vi.fn(),
          removeListener: vi.fn(),
        }) satisfies MediaQueryList,
    );

    const { placeholder } = mountSection();

    revealPlaceholder(placeholder);
    placeholder.replaceWith(document.createElement("article"));
    await flushMutations();

    expect(animate).not.toHaveBeenCalled();
  });
});
