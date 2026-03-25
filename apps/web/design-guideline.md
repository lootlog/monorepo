# Web App Design Guideline

This document defines the unified UI/UX design system for `apps/web`. All pages must follow these patterns to ensure visual consistency.

## Page Archetypes

### Archetype A: Scrollable Card Layout

Used for: detail pages, edit pages, table pages, dashboard pages.

```
Container: flex flex-col h-full min-h-0 bg-background/50
└── ScrollArea: flex-1 min-h-0
    └── Content: px-3 py-3 flex flex-col gap-4
        ├── Header Card (bg-card/60 p-4)
        ├── Content Cards (bg-card/40 p-3)
        └── Grid sections (lg:grid-cols-3 gap-4)
```

### Archetype B: Feed/List with Sidebar

Used for: infinite-scrolling feeds (loots, activity logs).

```
Container: w-full flex flex-col h-full overflow-hidden
├── Header bar (filters)
└── Content: flex-1 flex overflow-hidden
    ├── Main area: bg-background/20
    └── Animated sidebar (width: 320px, framer-motion)
```

## Design Tokens

| Token                    | Value                                                                   |
| ------------------------ | ----------------------------------------------------------------------- |
| Page background          | `bg-background/50`                                                      |
| Feed background          | `bg-background/20`                                                      |
| Card (content)           | `bg-card/40 backdrop-blur-sm border-border`                             |
| Card (header/page title) | `bg-card/60 backdrop-blur-sm border-border`                             |
| Card padding             | `p-3` (content) / `p-4` (header)                                        |
| Content gap              | `gap-4` between Cards                                                   |
| Inner gap                | `gap-3` within Cards                                                    |
| Page padding             | `px-3 py-3`                                                             |
| Title                    | `text-base font-semibold`                                               |
| Subtitle                 | `text-xs text-muted-foreground`                                         |
| Label (uppercase)        | `text-[10px] uppercase tracking-[0.18em]`                               |
| Icon container           | `rounded-xl bg-{color}/10 p-2.5 shadow-inner shadow-{color}/10`         |
| Grid layout              | `lg:grid-cols-3 gap-4`                                                  |
| Loading state            | `h-64 flex items-center justify-center` + `Spinner className="h-8 w-8"` |
| Empty state              | Card with centered icon + text                                          |

## Header Card Pattern

Every page must have a header Card that is visually distinct from content Cards:

```tsx
<Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
  <div className="flex items-center gap-3">
    <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
      <Icon className="size-4 text-primary" />
    </div>
    <div>
      <h2 className="text-base font-semibold leading-tight">{title}</h2>
      <p className="text-xs text-muted-foreground leading-tight">{subtitle}</p>
    </div>
  </div>
</Card>
```

### Icon Color Themes

Use semantic colors for icon containers:

- Primary/default: `bg-primary/10` → `text-primary`
- Kill/combat: `bg-red-500/10` → `text-red-500`
- Rankings/awards: `bg-amber-500/10` → `text-amber-500`
- Success/active: `bg-green-500/10` → `text-green-500`
- Info/stats: `bg-blue-500/10` → `text-blue-500`
- Heroes/NPC: `text-yellow-500`

## Table Page Pattern

For pages with data tables:

```tsx
<div className="flex flex-col h-full min-h-0 bg-background/50">
  <ScrollArea className="flex-1 min-h-0">
    <div className="px-3 py-3 flex flex-col gap-4">
      {/* Header Card with icon + title + filters */}
      <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
        ...
      </Card>

      {/* Table Card */}
      <Card className="flex-1 min-h-0 flex flex-col border-border bg-card/40 p-0 backdrop-blur-sm overflow-hidden gap-0">
        <ScrollArea className="relative flex-1 min-h-0 w-full">
          <Table>...</Table>
        </ScrollArea>

        {/* Pagination footer */}
        <div className="h-14 shrink-0 border-t border-border py-4 flex items-center justify-between px-4">
          ...
        </div>
      </Card>
    </div>
  </ScrollArea>
</div>
```

## Loading & Empty States

Loading state (centered spinner):

```tsx
<div className="flex items-center justify-center h-64">
  <Spinner className="h-8 w-8" />
</div>
```

Empty state (in Card):

```tsx
<Card className="flex flex-col items-center justify-center gap-3 bg-card/40 py-12 backdrop-blur-sm">
  <Icon className="w-12 h-12 text-muted-foreground opacity-50" />
  <p className="text-muted-foreground">{message}</p>
</Card>
```

## Typography

- Page titles: `text-base font-semibold` (inside header Cards)
- Section titles: `text-base font-semibold` with icon
- Metadata: `text-xs text-muted-foreground`
- Uppercase labels: `text-[10px] uppercase tracking-[0.18em] text-muted-foreground`
- Do NOT use `text-xl font-bold` for page titles — keep everything `text-base font-semibold`

## Buttons

- Standard: `size="sm"` for secondary/outline buttons
- Responsive: `w-full justify-center sm:w-auto`
- Icons in buttons: `size-3.5`

## Responsive Breakpoints

- `sm:` — 640px
- `md:` — 768px
- `lg:` — 1024px (main layout shift point)
- `xl:` — 1280px

## Scrolling

- Use `ScrollArea` from `@lootlog/ui` for all scrollable content
- Container must have `min-h-0` with `flex-1` for proper flex overflow
- Never use `overflow-y-auto` directly — always use ScrollArea
