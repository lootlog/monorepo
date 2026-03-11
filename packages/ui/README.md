# UI Components

Shared React component library built with Radix UI and Tailwind CSS.

## Overview

The UI package provides a collection of reusable, accessible, and customizable React components used across all frontend applications (Web, Game Client, Landing). Components are built on top of Radix UI primitives and styled with Tailwind CSS.

## Features

- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Full type safety
- **Accessible** - WCAG compliant components
- **Customizable** - Easy to theme and extend
- **Tree-Shakeable** - Only import what you need
- **Dark Mode** - Built-in dark mode support

## Components

### Form Components

- `Button` - Various button styles and sizes
- `Input` - Text input with validation
- `Select` - Dropdown select menu
- `Checkbox` - Checkbox with label
- `Radio` - Radio button group
- `Switch` - Toggle switch
- `Textarea` - Multi-line text input

### Layout Components

- `Card` - Container with header, content, footer
- `Dialog` - Modal dialog
- `Popover` - Floating popover menu
- `Dropdown` - Dropdown menu
- `Tabs` - Tab navigation
- `Accordion` - Collapsible sections

### Feedback Components

- `Toast` - Notification messages
- `Alert` - Alert banners
- `Tooltip` - Hover tooltips
- `Badge` - Status badges
- `Spinner` - Loading spinner
- `Progress` - Progress bar

### Data Display

- `Table` - Data tables
- `Avatar` - User avatars
- `Separator` - Visual divider
- `Skeleton` - Loading skeletons

## Usage

```typescript
import {
  Button,
  Input,
  Card,
  Dialog,
  Toast
} from '@lootlog/ui';

function MyComponent() {
  return (
    <Card>
      <Card.Header>
        <h2>Title</h2>
      </Card.Header>
      <Card.Content>
        <Input placeholder="Enter value" />
      </Card.Content>
      <Card.Footer>
        <Button>Submit</Button>
      </Card.Footer>
    </Card>
  );
}
```

## Styling

Components use Tailwind CSS for styling. You can customize:

```typescript
// Custom variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>

// Custom sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// Custom classes
<Button className="custom-class">Custom</Button>
```

## Development

```bash
# From monorepo root
cd packages/ui
pnpm dev                 # Start development mode
pnpm build               # Build package

# Components are automatically available via workspace:*
```

## File Structure

```
packages/ui/
├── src/
│   ├── components/      - React components
│   ├── hooks/           - Custom React hooks
│   ├── utils/           - Utility functions
│   └── index.ts         - Main export file
├── tailwind.config.ts   - Tailwind configuration
└── package.json
```

## Adding New Components

1. Create component in `src/components/`
2. Add Storybook story (optional)
3. Export from `src/index.ts`
4. Component is available in all apps

## Best Practices

- Use semantic HTML
- Ensure accessibility (ARIA labels, keyboard navigation)
- Follow existing component patterns
- Add TypeScript types for props
- Test with keyboard and screen readers
