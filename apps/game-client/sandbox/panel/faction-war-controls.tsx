import { useFactionWarPickStore } from "@/features/faction-war/faction-war-pick.store";
import { storageKey } from "@/lib/storage-key";
import { readSandboxFactionWarMode } from "../fake-faction-war-api";

const DISMISSED_PICKS_KEY = storageKey("ll:faction-war-pick-dismissed");

function switchMode(mode: "pick" | "champions" | null) {
  const url = new URL(window.location.href);

  if (mode) url.searchParams.set("faction-war", mode);
  else url.searchParams.delete("faction-war");

  window.location.assign(url);
}

/** Fake faction war states: the pick screen and champion highlights. */
export function FactionWarControls() {
  const mode = readSandboxFactionWarMode();
  const setOpen = useFactionWarPickStore((state) => state.setOpen);

  return (
    <section className="sbx-section">
      <h2>Faction war{mode ? ` · ${mode}` : ""}</h2>
      <div className="sbx-buttons">
        <button type="button" onClick={() => switchMode("pick")}>
          Fake war, no pick
        </button>
        <button type="button" onClick={() => switchMode("champions")}>
          Fake champions
        </button>
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
            localStorage.removeItem(DISMISSED_PICKS_KEY);
            window.location.reload();
          }}
        >
          Forget &quot;Nie teraz&quot;
        </button>
      </div>
    </section>
  );
}
