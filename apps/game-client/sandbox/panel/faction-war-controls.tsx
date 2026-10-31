import { announceFactionWarPoints } from "@/features/faction-war/faction-war-points-toast";
import { useFactionWarPickStore } from "@/features/faction-war/faction-war-pick.store";
import { storageKey } from "@/lib/storage-key";
import {
  readSandboxFactionWarMode,
  type SandboxFactionWarMode,
} from "../fake-faction-war-api";

const DISMISSED_PICKS_KEY = storageKey("ll:faction-war-pick-dismissed");

const SEEN_RESULTS_KEY = storageKey("ll:faction-war-result-seen");

const MODES: readonly { mode: SandboxFactionWarMode; label: string }[] = [
  { mode: "pick", label: "Fake war, no pick" },
  { mode: "champions", label: "Fake champions" },
  { mode: "ended", label: "Ended: Barbatos wins" },
  { mode: "ended-tie", label: "Ended: tie" },
  { mode: "ended-none", label: "Ended: nobody scored" },
  { mode: "disqualified", label: "Disqualified" },
];

/** A kill, its loot and a second kill: one toast that adds up to 92. */
const POINTS_BURST = [
  { delayMs: 0, points: 40 },
  { delayMs: 400, points: 12 },
  { delayMs: 1_100, points: 40 },
];

function switchMode(mode: SandboxFactionWarMode | null) {
  const url = new URL(window.location.href);

  if (mode) url.searchParams.set("faction-war", mode);
  else url.searchParams.delete("faction-war");

  window.location.assign(url);
}

function forget(key: string) {
  localStorage.removeItem(key);
  window.location.reload();
}

/** Fake faction war states: pick screen, champions, result and point toasts. */
export function FactionWarControls() {
  const mode = readSandboxFactionWarMode();
  const setOpen = useFactionWarPickStore((state) => state.setOpen);

  return (
    <section className="sbx-section">
      <h2>Faction war{mode ? ` · ${mode}` : ""}</h2>
      <div className="sbx-buttons">
        {MODES.map((entry) => (
          <button
            key={entry.mode}
            type="button"
            onClick={() => switchMode(entry.mode)}
          >
            {entry.label}
          </button>
        ))}
        {mode ? (
          <button type="button" onClick={() => switchMode(null)}>
            Real API
          </button>
        ) : null}
        <button type="button" onClick={() => setOpen(true)}>
          Open pick screen
        </button>
        <button
          type="button"
          onClick={() => {
            for (const { delayMs, points } of POINTS_BURST) {
              window.setTimeout(
                () => announceFactionWarPoints({ faction: "BARBATOS", points }),
                delayMs,
              );
            }
          }}
        >
          Point toasts (burst)
        </button>
        <button
          type="button"
          onClick={() =>
            announceFactionWarPoints({ faction: "TANROTH", points: 52 })
          }
        >
          Point toast (Tanroth)
        </button>
        <button type="button" onClick={() => forget(DISMISSED_PICKS_KEY)}>
          Forget &quot;Nie teraz&quot;
        </button>
        <button type="button" onClick={() => forget(SEEN_RESULTS_KEY)}>
          Forget seen result
        </button>
      </div>
    </section>
  );
}
