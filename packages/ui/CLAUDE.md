# UI

Shared React component library built on Radix UI and Tailwind CSS.

## Components (48 total)

**Forms:** Button, Input, Textarea, Select, Checkbox, Switch, Label, Command

**Dialogs:** Dialog, Alert-Dialog, Drawer, Sheet, Popover, Context-Menu, Dropdown-Menu

**Navigation:** Tabs, Accordion, Collapsible, Navigation-Menu, Sidebar, Pagination

**Data Display:** Table, Card, Badge, Avatar, Skeleton, Separator, Scroll-Area, Tooltip

**Feedback:** Toast (Sonner), Spinner, Calendar, Date-Time-Picker

**Special:** Chart (Recharts), Form (React Hook Form), Filter-Popover, Image-Zoom

## Key Files

- `src/components/` - All component files
- `src/lib/utils.ts` - `cn()` helper (clsx + tailwind-merge)
- `src/styles/globals.css` - Tailwind + color tokens

## Usage

```typescript
import { Button, Dialog, Card } from '@lootlog/ui';
```

## Notes

- All components use Radix UI primitives
- CVA (class-variance-authority) for variants
- Tree-shakeable exports
