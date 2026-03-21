import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lootlog Developer Portal" },
      {
        name: "description",
        content: "Portal deweloperski Lootlog - wkrótce",
      },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
        <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Wkrótce
      </div>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        <span className="text-foreground">Lootlog</span>{" "}
        <span className="text-muted-foreground/60">Developer Portal</span>
      </h1>
      <p className="mt-4 max-w-lg text-center text-lg leading-relaxed text-muted-foreground">
        Portal deweloperski jest w trakcie budowy. Wróć wkrótce!
      </p>
    </div>
  );
}
