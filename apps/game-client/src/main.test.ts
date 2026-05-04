import { afterEach, describe, expect, it, vi } from "vitest";

const loadMain = async () => {
  vi.resetModules();
  return import("./main");
};

vi.mock("react-dom/client", () => ({
  default: {
    createRoot: vi.fn(() => ({
      render: vi.fn(),
    })),
  },
}));

vi.mock("./App", () => ({
  default: () => null,
}));

describe("getLootlogRootZIndex", () => {
  afterEach(() => {
    document.cookie = "interface=; Max-Age=0";
    vi.unstubAllGlobals();
  });

  it("uses z-index 381 for the si interface cookie", async () => {
    vi.stubGlobal(
      "getCookie",
      vi.fn(() => "si"),
    );

    const { getLootlogRootZIndex } = await loadMain();

    expect(getLootlogRootZIndex()).toBe(381);
  });

  it("uses z-index 11 for the ni interface cookie", async () => {
    vi.stubGlobal(
      "getCookie",
      vi.fn(() => "ni"),
    );

    const { getLootlogRootZIndex } = await loadMain();

    expect(getLootlogRootZIndex()).toBe(11);
  });

  it("falls back to z-index 11 when the interface cookie is missing", async () => {
    vi.stubGlobal(
      "getCookie",
      vi.fn(() => null),
    );

    const { getLootlogRootZIndex } = await loadMain();

    expect(getLootlogRootZIndex()).toBe(11);
  });

  it("reads document.cookie when window.getCookie is unavailable", async () => {
    document.cookie = "interface=si";

    const { getLootlogRootZIndex } = await loadMain();

    expect(getLootlogRootZIndex()).toBe(381);
  });
});
