import { useSandboxLog } from "../fake-runtime/sandbox-log";

const KIND_LABEL = {
  inbound: "in",
  outbound: "out",
  message: "msg",
} as const;

export function SandboxLogList() {
  const entries = useSandboxLog((state) => state.entries);
  const clear = useSandboxLog((state) => state.clear);

  return (
    <section className="sbx-section">
      <h2>
        Runtime log
        <button type="button" className="sbx-inline" onClick={clear}>
          Clear
        </button>
      </h2>
      <ol className="sbx-log">
        {entries.map((entry) => (
          <li key={entry.id}>
            <span className="sbx-muted">
              {entry.at.toLocaleTimeString()} {KIND_LABEL[entry.kind]}
            </span>{" "}
            {entry.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
