# Web App Styleguide

This document outlines the styling conventions and patterns used in the web application.

## Page Structure

### Root Container

All feature pages use a consistent root container structure:

```tsx
<div className="flex flex-col gap-4">
  {/* Header */}
  {/* Content */}
</div>
```

### Page Header

Headers follow a specific pattern with icon, title, and optional actions:

```tsx
<div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
  <div className="flex items-center gap-3 flex-1 min-w-0">
    {/* Optional back button for sub-pages */}
    <Link to="/$guildId/parent-route" params={{ guildId: guildId ?? "" }}>
      <Button variant="ghost" size="icon" className="shrink-0">
        <ArrowLeft className="size-4" />
      </Button>
    </Link>

    {/* Icon badge */}
    <div className="p-2 rounded-lg bg-primary/10">
      <IconComponent className="size-4 text-primary" />
    </div>

    {/* Title and description */}
    <div>
      <h2 className="text-sm font-semibold leading-tight">
        {t("feature.title")}
      </h2>
      <p className="text-xs text-muted-foreground leading-tight">
        {t("feature.description")}
      </p>
    </div>
  </div>

  {/* Optional action buttons */}
  <div className="flex items-center gap-2">
    <Button size="sm">
      <Plus className="w-4 h-4 mr-2" />
      {t("feature.action")}
    </Button>
  </div>
</div>
```

### Content Area

Content should be wrapped with horizontal padding:

```tsx
<div className="px-3">{/* Content cards, lists, forms */}</div>
```

Or for forms, apply padding directly:

```tsx
<form className="px-3 space-y-4">{/* Form content */}</form>
```

## Cards

### Standard Card

```tsx
<Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
  {/* Card content */}
</Card>
```

### Interactive Card (clickable)

```tsx
<Card className="p-4 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all cursor-pointer border-border hover:border-primary/30">
  {/* Card content */}
</Card>
```

### Active/Highlighted Card

```tsx
<Card className={`p-4 bg-card/40 backdrop-blur-sm ${
  isActive
    ? "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:border-yellow-500/70"
    : "border-border hover:border-primary/30"
}`}>
```

### Empty State Card

```tsx
<Card className="flex flex-col items-center justify-center h-64 gap-4 bg-card/40 backdrop-blur-sm">
  <Icon className="w-16 h-16 text-muted-foreground" />
  <p className="text-muted-foreground">{t("feature.empty")}</p>
  <Button>
    <Plus className="w-4 h-4 mr-2" />
    {t("feature.create")}
  </Button>
</Card>
```

## Loading States

### Centered Spinner

```tsx
<div className="flex items-center justify-center h-64">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
</div>
```

### Button Loading State

```tsx
<Button disabled={isPending}>
  {isPending ? (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
  ) : (
    <Icon className="w-4 h-4 mr-2" />
  )}
  {t("action.label")}
</Button>
```

## Error States

```tsx
<div className="flex flex-col items-center justify-center h-64 gap-4">
  <AlertCircle className="w-12 h-12 text-destructive" />
  <p className="text-muted-foreground">{t("feature.error")}</p>
</div>
```

## Badges and Tags

### Map/Location Tag

```tsx
<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
  <MapPin className="w-3 h-3" />
  {mapName}
</span>
```

### Removable Tag

```tsx
<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
  {tagName}
  <button type="button" onClick={onRemove} className="hover:text-destructive">
    <X className="w-3 h-3" />
  </button>
</span>
```

## List Items

### Standard List Item with Actions

```tsx
<div className="p-3 bg-muted/50 rounded-lg border border-border">
  <div className="flex items-start justify-between mb-2">
    <div>
      <p className="font-medium">{item.name}</p>
      <p className="text-sm text-muted-foreground">{item.subtitle}</p>
    </div>
    <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
      <X className="w-4 h-4" />
    </Button>
  </div>
  {/* Additional content */}
</div>
```

### Nested List Item

```tsx
<div className="p-2 bg-muted/30 rounded-lg border border-border/50">
  {/* Content */}
</div>
```

## Forms

### Form Structure

```tsx
<form onSubmit={handleSubmit} className="px-3 space-y-4">
  <Card className="p-4 bg-card/40 backdrop-blur-sm border-border space-y-4">
    {/* Form fields */}
  </Card>

  <Button type="submit" className="w-full">
    Submit
  </Button>
</form>
```

### Form Field

```tsx
<div className="space-y-2">
  <Label htmlFor="fieldId">{t("field.label")}</Label>
  <Input
    id="fieldId"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    placeholder={t("field.placeholder")}
  />
</div>
```

### Switch Field

```tsx
<div className="flex items-center justify-between">
  <Label htmlFor="switchId">{t("switch.label")}</Label>
  <Switch id="switchId" checked={checked} onCheckedChange={setChecked} />
</div>
```

### Inline Form (e.g., add to list)

```tsx
<div className="space-y-3 p-3 border rounded-lg">
  <Input placeholder="Field 1" />
  <Input placeholder="Field 2" />
  <Button type="button" onClick={onAdd} className="w-full">
    Add Item
  </Button>
</div>
```

## Icon Sizes

- Header icons: `size-4` (16px)
- Card icons: `w-5 h-5` (20px)
- Empty state icons: `w-16 h-16` (64px)
- Error icons: `w-12 h-12` (48px)
- Tag icons: `w-3 h-3` (12px)
- Button icons: `w-4 h-4` (16px)

## Button Patterns

### Header Action Button

```tsx
<Button size="sm">
  <Plus className="w-4 h-4 mr-2" />
  {t("action")}
</Button>
```

### Outline Action Button

```tsx
<Button variant="outline" size="sm">
  <Icon className="w-4 h-4 mr-1" />
  {t("action")}
</Button>
```

### Icon-only Button

```tsx
<Button variant="ghost" size="icon">
  <Icon className="w-4 h-4" />
</Button>
```

### Destructive Icon Button

```tsx
<Button
  variant="ghost"
  size="icon"
  className="text-destructive hover:text-destructive hover:bg-destructive/10"
>
  <Trash2 className="w-4 h-4" />
</Button>
```

## Animation Classes

- Pulse indicator: `animate-ping`
- Spinner: `animate-spin`
- Transition: `transition-all`

## Color Tokens

- Primary background: `bg-primary/10`
- Primary text: `text-primary`
- Muted text: `text-muted-foreground`
- Destructive: `text-destructive`
- Active/highlight: `text-yellow-500`, `border-yellow-500/50`
- Card background: `bg-card/40`
- Muted background: `bg-muted/50`, `bg-muted/30`

## Translation Keys

Always use translation keys with fallback values:

```tsx
{
  t("feature.title", "Default Title");
}
```

For sub-pages, include description translations:

```tsx
<h2>{t("events.create")}</h2>
<p>{t("events.createDescription", "Create a new event")}</p>
```
