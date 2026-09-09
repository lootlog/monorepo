import { getChangelogEntries } from "@/lib/changelog";

export function ChangelogIndex() {
  const entries = getChangelogEntries();

  return (
    <div>
      {entries.map((entry) => (
        <section key={entry.url}>
          <h2 id={entry.slug}>
            <a href={entry.url}>{entry.title}</a>
          </h2>
        </section>
      ))}
    </div>
  );
}
