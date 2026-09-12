import { useState } from "react";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { isObjectRecord } from "@lootlog/schema/records";

export function RawEventForm({
  onEmit,
}: {
  onEmit: (event: GameEvent) => void;
}) {
  const [value, setValue] = useState('{\n  "h": { "x": 20, "y": 12 }\n}');
  const [error, setError] = useState<string | null>(null);

  const emit = () => {
    try {
      const event: unknown = JSON.parse(value);

      if (!isObjectRecord(event)) {
        setError("A game packet must be a JSON object");

        return;
      }

      setError(null);
      // SAFETY: the sandbox forwards arbitrary packets exactly like the native
      // seam; Lootlog's parsers discriminate the fields they read.
      onEmit(event as GameEvent);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Bad JSON");
    }
  };

  return (
    <section className="sbx-section">
      <h2>Raw packet</h2>
      <textarea
        aria-label="Raw game packet JSON"
        className="sbx-textarea"
        rows={5}
        spellCheck={false}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      {error ? <p className="sbx-error">{error}</p> : null}
      <div className="sbx-buttons">
        <button type="button" onClick={emit}>
          Emit through parseJSON
        </button>
      </div>
    </section>
  );
}
