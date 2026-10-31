import { configureApiClients } from "@lootlog/client/transport";
import { waitFor } from "@testing-library/react";
import { expect, it, onTestFinished, vi } from "vitest";
import type { RuntimeTipItem } from "@/lib/margonem-runtime/adapters/item-tip-runtime-adapter";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { installWeaponKillsTooltips, setWeaponKills } from "./weapon-kills";

type TipWindow = Window & {
  MargoTipsParser?: { getTip: (item: RuntimeTipItem) => string };
};

const tipWindow: TipWindow = window;

// `firstRead` answers the hero's counters read that installation starts.
const setUp = (firstRead?: () => Promise<Response>) => {
  setTestRuntimeGame({ hero: { characterId: "12345" }, world: "luvia" });

  const fetch = vi.fn<typeof globalThis.fetch>(() =>
    Promise.resolve(Response.json({ weapons: [{ itemId: "555", kills: 3 }] })),
  );

  if (firstRead) fetch.mockImplementationOnce(firstRead);

  onTestFinished(
    configureApiClients({
      main: { baseUrl: "https://api.example.test", fetch },
      battlelog: { baseUrl: "https://battlelog.example.test", fetch },
    }),
  );

  tipWindow.MargoTipsParser = { getTip: () => "<b>Item</b>" };
  const uninstall = installWeaponKillsTooltips();

  onTestFinished(() => {
    uninstall();
    delete tipWindow.MargoTipsParser;
  });

  return {
    fetch,
    getTip: (item: RuntimeTipItem) => tipWindow.MargoTipsParser?.getTip(item),
  };
};

it("adds the counter to a main weapon tip once its owner's counters arrive", async () => {
  const { fetch, getTip } = setUp();

  const weapon = {
    id: 555,
    cl: 1,
    own: 12345,
    setTip: vi.fn(() => getTip(weapon)),
  };

  // The game built this tip before the counters were loaded.
  expect(getTip(weapon)).toBe("<b>Item</b>");

  await waitFor(() => expect(weapon.setTip).toHaveBeenCalled());

  expect(getTip(weapon)).toContain("Zabici gracze: 3");
  expect(new URL(String(fetch.mock.calls[0]?.[0])).pathname).toBe(
    "/weapon-kills/luvia/12345",
  );
});

it("leaves the tips of other item classes unchanged", async () => {
  const { getTip } = setUp();
  const shield = { id: 555, cl: 14, own: 12345 };

  setWeaponKills("luvia", "12345", "555", 3);

  expect(getTip(shield)).toBe("<b>Item</b>");
});

it("retries a failed counter read shortly instead of holding it for minutes", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

  onTestFinished(() => warn.mockRestore());

  const { getTip } = setUp(() =>
    Promise.resolve(Response.json({ message: "down" }, { status: 503 })),
  );

  const weapon = {
    id: 555,
    cl: 1,
    own: 12345,
    setTip: vi.fn(() => getTip(weapon)),
  };

  getTip(weapon);
  await waitFor(() => expect(warn).toHaveBeenCalled());

  const now = Date.now();
  const clock = vi.spyOn(Date, "now").mockReturnValue(now + 31_000);

  onTestFinished(() => clock.mockRestore());
  getTip(weapon);
  await waitFor(() => expect(weapon.setTip).toHaveBeenCalled());

  expect(getTip(weapon)).toContain("Zabici gracze: 3");
});

it("keeps a counter recorded while an older read was in flight", async () => {
  let answerRead: (response: Response) => void = () => {};

  const { fetch, getTip } = setUp(
    () =>
      new Promise((resolve) => {
        answerRead = resolve;
      }),
  );

  const weapon = { id: 555, cl: 1, own: 12345, setTip: vi.fn() };

  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  setWeaponKills("luvia", "12345", "555", 4);
  answerRead(Response.json({ weapons: [{ itemId: "555", kills: 3 }] }));
  // Let the read's response settle into the cache.
  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(getTip(weapon)).toContain("Zabici gracze: 4");
});
