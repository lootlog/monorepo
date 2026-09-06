# Text links

Use `TextLink` for text navigation. It shares its muted color, semibold weight,
primary hover color, focus ring and reduced-motion behavior with `ChevronLink`.
It stays inline and adds no minimum height, so links do not change paragraph rhythm.

```tsx
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";

<TextLink render={<Link to="/$guildId" params={{ guildId }} />}>
  Organization
</TextLink>
<TextLink className="text-sm" href="https://example.com" target="_blank" rel="noopener noreferrer">
  Documentation
</TextLink>
```

The default font size is 12px for metadata and supporting links. Use `text-sm`
for names and body content. Keep destination, search, hash, target, rel and download
attributes on the anchor or router link. Use `ChevronLink` when the existing
interface calls for a trailing arrow.

Rich-text systems that create anchors outside React can use `textLinkClassName`
from the same module. Do not duplicate its interaction styles in editor themes.

Navigation buttons, tabs, sidebar entries, linked cards and linked table rows
retain their dedicated components. Programmatic redirects after mutations and
URL updates for filters are not text links and should remain programmatic.
