// @vitest-environment happy-dom
import { useRef } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import battle from "@/i18n/translations/battle.json";
import battlePanel from "@/i18n/translations/battle-panel.json";
import { BattleLog } from "./battle-log";
import { BattleLogList, type BattleLogListProps } from "./battle-log-list";
import type { RawBattleParsedEvent } from "@/lib/api/battlelog-types";

const i18n = i18next.createInstance();
i18n.init({
  lng: "pl",
  resources: { pl: { translation: { battle, battlePanel } } },
  interpolation: { escapeValue: false },
});
const events: RawBattleParsedEvent[] = Array.from(
  { length: 1000 },
  (_, index) => ({
    attackerId: "1",
    defenderId: "2",
    attackerHpPercentage: 100,
    defenderHpPercentage: 100,
    actions: [
      {
        actionType:
          index === 899 || index === 399 ? "legbon_holytouch_heal" : "+dmg",
        param: index === 899 || index === 399 ? "5359" : "10",
      },
    ],
  }),
);
let desktop = true;

function Fixture(props: Partial<BattleLogListProps>) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  return (
    <I18nextProvider i18n={i18n}>
      <div ref={outer} data-testid="outer">
        <div ref={inner} data-testid="inner">
          <BattleLogList
            events={events}
            warriors={[]}
            scrollViewportRef={inner}
            outerScrollViewportRef={outer}
            {...props}
          />
        </div>
      </div>
    </I18nextProvider>
  );
}

function SearchFixture({
  onTurnFocus,
}: {
  onTurnFocus: (turn: number) => void;
}) {
  const outer = useRef<HTMLDivElement>(null);
  return (
    <I18nextProvider i18n={i18n}>
      <div ref={outer} data-testid="outer">
        <BattleLog
          rawBattle={{
            accountId: "1",
            characterId: "1",
            world: "test",
            events,
          }}
          warriors={[]}
          outerScrollViewportRef={outer}
          listScrollClassName="h-96"
          onTurnFocus={onTurnFocus}
        />
      </div>
    </I18nextProvider>
  );
}

beforeEach(() => {
  desktop = true;
  vi.spyOn(window, "matchMedia").mockImplementation((media) => ({
    matches: desktop,
    media,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  }));
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.tagName === "LI" ? 72 : 480;
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(480);
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(
    72_000,
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const viewport = document.querySelector<HTMLElement>(
        desktop ? '[data-testid="inner"]' : '[data-testid="outer"]',
      );
      const translation = Number.parseFloat(
        this.style.transform.match(/translateY\(([-\d.]+)px\)/)?.[1] ?? "0",
      );
      const top =
        this.tagName === "LI" ? translation - (viewport?.scrollTop ?? 0) : 0;
      return new DOMRect(0, top, 800, this.tagName === "LI" ? 72 : 480);
    },
  );
  vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(function (
    this: HTMLElement,
    options?: ScrollToOptions | number,
  ) {
    if (typeof options === "object")
      this.scrollTop = options.top ?? this.scrollTop;
    this.dispatchEvent(new Event("scroll"));
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("virtual battle log", () => {
  it.each([true, false])(
    "keeps mounted rows bounded using the actual viewport (desktop=%s)",
    async (isDesktop) => {
      desktop = isDesktop;
      const view = render(<Fixture />);
      await waitFor(() =>
        expect(
          view.container.querySelectorAll("[data-battle-turn]").length,
        ).toBeGreaterThan(0),
      );
      expect(
        view.container.querySelectorAll("[data-battle-turn]").length,
      ).toBeLessThan(40);
      const viewport = view.getByTestId(isDesktop ? "inner" : "outer");
      act(() => {
        viewport.scrollTop = 36_000;
        fireEvent.scroll(viewport);
      });
      await waitFor(() =>
        expect(
          view.container.querySelector('[data-battle-turn="501"]'),
        ).not.toBeNull(),
      );
      expect(view.container.querySelector('[data-battle-turn="1"]')).toBeNull();
      expect(
        view.container.querySelectorAll("[data-battle-turn]").length,
      ).toBeLessThan(40);
    },
  );

  it("positions and highlights a distant search result", async () => {
    const onComplete = vi.fn();
    const view = render(<Fixture searchMatchedTurns={[900]} />);
    expect(view.container.querySelector('[data-battle-turn="900"]')).toBeNull();
    view.rerender(
      <Fixture
        searchMatchedTurns={[900]}
        activeSearchTurn={900}
        onSelectedTurnScrollComplete={onComplete}
      />,
    );
    await waitFor(() =>
      expect(
        view.container.querySelector(
          '[data-battle-turn="900"][data-battle-search-active="true"]',
        ),
      ).not.toBeNull(),
    );
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(900));
  });

  it("retains a keyboard-focused row when it leaves the viewport", async () => {
    const onSelect = vi.fn();
    const view = render(<Fixture onTurnSelect={onSelect} />);
    const first = await waitFor(() => {
      const row = view.container.querySelector<HTMLElement>(
        '[data-battle-turn="1"]',
      );
      expect(row).not.toBeNull();
      return row;
    });
    if (!first) throw new Error("Missing first turn");
    fireEvent.focus(first);
    fireEvent.keyDown(first, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(1);
    act(() => {
      view.getByTestId("inner").scrollTop = 36_000;
      fireEvent.scroll(view.getByTestId("inner"));
    });
    await waitFor(() =>
      expect(
        view.container.querySelector('[data-battle-turn="501"]'),
      ).not.toBeNull(),
    );
    expect(
      view.container.querySelector('[data-battle-turn="1"]'),
    ).not.toBeNull();
    fireEvent.blur(first);
    await waitFor(() =>
      expect(view.container.querySelector('[data-battle-turn="1"]')).toBeNull(),
    );
  });
  it("releases an unreachable scroll request without reporting completion", async () => {
    vi.mocked(HTMLElement.prototype.scrollTo).mockImplementation(() => {});
    const onCancel = vi.fn();
    const onComplete = vi.fn();
    render(
      <Fixture
        selectedTurn={900}
        scrollToSelectedTurnRequestId={1}
        onSelectedTurnScrollCancel={onCancel}
        onSelectedTurnScrollComplete={onComplete}
      />,
    );
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith(900), {
      timeout: 3000,
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("cancels pending alignment when the user starts scrolling", async () => {
    const onCancel = vi.fn();
    const onComplete = vi.fn();
    const view = render(
      <Fixture
        selectedTurn={900}
        scrollToSelectedTurnRequestId={1}
        onSelectedTurnScrollCancel={onCancel}
        onSelectedTurnScrollComplete={onComplete}
      />,
    );
    fireEvent.wheel(view.getByTestId("inner"), { deltaY: 20 });
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith(900));
    expect(onComplete).not.toHaveBeenCalled();
  });
  it("searches offscreen Polish text, cycles matches and clears results as input changes", async () => {
    const onTurnFocus = vi.fn();
    const view = render(<SearchFixture onTurnFocus={onTurnFocus} />);
    const input = view.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "dotyk aniola" } });
    await waitFor(() => expect(onTurnFocus).toHaveBeenLastCalledWith(400));
    const next = view.getByRole("button", {
      name: i18n.t("battlePanel.single.log.search.next"),
    });
    const previous = view.getByRole("button", {
      name: i18n.t("battlePanel.single.log.search.previous"),
    });
    fireEvent.click(next);
    await waitFor(() => expect(onTurnFocus).toHaveBeenLastCalledWith(900));
    fireEvent.click(next);
    await waitFor(() => expect(onTurnFocus).toHaveBeenLastCalledWith(400));
    fireEvent.click(previous);
    await waitFor(() => expect(onTurnFocus).toHaveBeenLastCalledWith(900));
    onTurnFocus.mockClear();
    fireEvent.change(input, { target: { value: "not-present" } });
    await waitFor(() => expect(next.hasAttribute("disabled")).toBe(true));
    expect(onTurnFocus).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "" } });
    expect(
      view.container.querySelector('[data-battle-search-match="true"]'),
    ).toBeNull();
  });
});
