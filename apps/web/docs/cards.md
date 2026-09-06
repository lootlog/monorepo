# Web card composition

The event overview is the visual reference for section cards. These components belong to the web app; do not change the shared UI package defaults to apply this style to other applications.

## Page and section headings

Use `PageHeader` for the page identity, once per rendered page. It renders an `h1`, an optional primary icon, description, metadata, status, and actions. Its children are full-width content below the padded heading, suitable for a footer or navigation strip.

Use `SectionCard` with `SectionCardHeader` for a titled section. The header renders an `h2`, a 16px primary icon when supplied, a 14px semibold title, and wrapping actions. Its minimum height is 48px, with 12px horizontal and 8px vertical padding. Do not override header typography or reproduce its markup locally.

`SectionCardContent` supplies 12px padding. Tables and record lists may sit directly below the header: their rows own their padding. `SectionCardFooter` supplies a separated muted action strip with 6px padding and 4px gaps, matching the event overview. Filters sit below the heading with 12px horizontal and 8px vertical padding and a bottom separator.

Keep scroll ownership in the page or existing working panel. The card primitives do not create scroll containers, set viewport heights, or change virtualizer references.

## Form section

```tsx
<SectionCard>
  <SectionCardHeader icon={Settings} title={t("settings.general.title")} />
  <SectionCardContent>
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      {fields}
      {submitButton}
    </form>
  </SectionCardContent>
</SectionCard>
```

Keep existing validation, form IDs, submit semantics, and unsaved-change handling. A footer submit button outside the form must retain the correct `form` attribute.

## Table section

```tsx
<SectionCard>
  <SectionCardHeader
    icon={Trophy}
    title={t("events.ranking.title")}
    actions={viewAllLink}
  />
  <div className="min-w-0 overflow-x-auto">{table}</div>
  <SectionCardFooter>{pagination}</SectionCardFooter>
</SectionCard>
```

A virtualized table keeps its existing bounded scroll viewport and ref in place of the illustrative wrapper above. Do not add a second vertical scroll around it.

## Embedded records

```tsx
<SectionCard>
  <SectionCardHeader title={t("events.recentLoots.title")} icon={Package} />
  <div className="divide-y divide-border/70">
    {records.map((record) => (
      <div key={record.id} className="min-w-0 p-3">
        {renderRecordContent(record)}
      </div>
    ))}
  </div>
</SectionCard>
```

`renderRecordContent` must render content, not another card. Reuse the actual record component's explicit embedded presentation where available. Standalone clickable records can keep their own card surface on a record list. Metrics do not need an artificial section header for each value.

## One surface per section

Do not nest decorative cards. Remove a redundant outer card when its children are independent sections. Otherwise render internal groups as rows or sections separated by spacing, a divider, or subtle background color. Dialog content is already a surface: internal groups do not need another border, shadow, or rounded frame.

Preserve functional borders for inputs, focus, selected items, validation, and item rarity. Alerts and selectable options remain distinguishable controls rather than being flattened indiscriminately. Theme-specific colors and decorations remain owned by the existing UI primitives.

Loading, empty, and error states use the same section structure as loaded content. Check all route definitions and dialog entry points during migration; record unavailable data states explicitly instead of claiming runtime coverage for them.
