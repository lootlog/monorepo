# Landing

Marketing website and documentation hub for Lootlog.

## Tech Stack

- Next.js 16 with React 19
- Fumadocs for documentation (MDX)
- Tailwind CSS + @lootlog/ui components
- Framer Motion for animations
- Better-Auth for authentication
- Static export (SSG)

## Commands

```bash
pnpm dev              # Dev server on port 3003 (Turbopack)
pnpm build            # Build for production
pnpm export:landing   # Export as static site
```

## Key Files

- `src/app/page.tsx` - Main landing page
- `src/app/docs/[[...slug]]/page.tsx` - Documentation pages
- `src/components/landing/` - Hero, header, footer, features, FAQ, testimonials
- `content/docs/` - MDX documentation files
- `source.config.ts` - Fumadocs configuration

## Environment Variables

- `NEXT_PUBLIC_AUTH_SERVICE_URL` - Auth service endpoint
- `NEXT_PUBLIC_ADDON_URL` - Addon download URL

## Notes

- Dark theme forced (`forcedTheme: "dark"`)
- Polish language (lang="pl")
- Static export configured (`output: "export"`)
