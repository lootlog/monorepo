---
name: Lootlog Signal System
description: One shared visual signal for every Lootlog surface, from persuasion through operation to reading.
colors:
  night-ink: "#07111f"
  raised-ink: "#0d1a2c"
  signal-paper: "#f4f1e8"
  paper-ink: "#0a1830"
  broadcast-cobalt: "#3157f6"
  sync-cyan: "#35d3e4"
  resp-lime: "#c8f135"
  timer-amber: "#ffbd3f"
  alert-coral: "#ff665b"
  signal-white: "#f7f8f2"
  text-cloud: "#b9c8de"
  text-quiet: "#91a4bf"
  rule-blue: "#2b3b53"
typography:
  display:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "clamp(3rem, 7.4vw, 6rem)"
    fontWeight: 900
    lineHeight: 0.91
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 900
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  mono:
    fontFamily: "Geist Mono, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  none: "0px"
  brand: "8px"
  control: "12px"
  product: "16px"
  chapter: "28px"
  circle: "9999px"
spacing:
  signal: "4px"
  compact: "8px"
  control: "12px"
  gutter-mobile: "20px"
  content: "24px"
  gutter-tablet: "32px"
  section: "48px"
  gutter-desktop: "48px"
  chapter: "64px"
  campaign: "96px"
components:
  brand-mark:
    backgroundColor: "{colors.night-ink}"
    rounded: "{rounded.brand}"
    size: "28px"
  button-primary:
    backgroundColor: "{colors.signal-white}"
    textColor: "{colors.night-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "56px"
  button-brand:
    backgroundColor: "{colors.broadcast-cobalt}"
    textColor: "{colors.signal-white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "56px"
  button-signal:
    backgroundColor: "{colors.resp-lime}"
    textColor: "{colors.night-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  navigation:
    backgroundColor: "{colors.night-ink}"
    textColor: "{colors.signal-white}"
    height: "72px"
  product-window:
    backgroundColor: "{colors.night-ink}"
    rounded: "{rounded.product}"
  broadcast-chapter:
    backgroundColor: "{colors.broadcast-cobalt}"
    textColor: "{colors.signal-white}"
    rounded: "{rounded.chapter}"
    padding: "64px"
---

# Design System: Lootlog Signal System

## Overview

**Creative North Star: "The Shared Signal"**

Lootlog looks like one signal moving between the game, a clan and the decisions made from shared data. The visual system is dark, flat, direct and unusually colorful: Night Ink establishes continuity while cobalt, cyan, lime, amber and coral make routes, states and chapter changes immediately legible. Resp Orbit is the permanent brand anchor; signal routes, rings and nodes are its larger compositional vocabulary.

The landing page is the system's most expressive Persuade surface and the source of its identity. Other products inherit the same tokens and grammar at the intensity appropriate to their mode. Web is Operate: dense, precise and data-first. Wiki and Developer are Read: calm, structured and optimized for long-form comprehension. They share a world without reproducing the landing composition.

Real product interfaces and real data are the evidence. Decoration explains flow, synchronization, timing or priority; it never invents fantasy content or competes with the task.

**Key Characteristics:**

- Ink-dark continuity with bold, flat chapter color
- Resp Orbit, signal routes, rings and nodes as one geometric family
- Geist typography with decisive weight and compact tracking
- Real product UI and data as the visual proof
- Expressive Persuade, restrained Operate and calm Read modes

## Colors

The palette behaves like an operational signal set placed on a deep navy-black field.

### Primary

- **Broadcast Cobalt:** The principal brand field for selected states, primary product actions and expressive Persuade chapters.
- **Resp Lime:** The highest-attention signal for installation, readiness, positive synchronization and the Resp Orbit.

### Secondary

- **Sync Cyan:** Live connection, information flow, linked data and secondary focus.
- **Timer Amber:** Time, waiting, caution and notable but non-destructive attention.

### Tertiary

- **Alert Coral:** Errors, support, urgent decisions and expressive closing moments. It is not a generic decorative pink.

### Neutral

- **Night Ink:** Default domain background, app-shell anchor and dark navigation.
- **Raised Ink:** Secondary dark surfaces, FAQ areas and operational grouping.
- **Signal Paper:** Warm light chapter and Read-mode surface.
- **Paper Ink:** Text and controls placed on Signal Paper.
- **Signal White:** High-contrast text and the light primary action.
- **Text Cloud:** Primary supporting copy on dark surfaces.
- **Text Quiet:** Metadata, captions and tertiary explanation.
- **Rule Blue:** Dividers and quiet structural borders.

### Named Rules

**The Signal Has Meaning Rule.** Cobalt, cyan, lime, amber and coral must communicate route, state, priority or action; never scatter them as arbitrary confetti.

**The One Dominant Signal Rule.** A screen may have many states, but only one accent should dominate its visual hierarchy.

**The Mode Intensity Rule.** Persuade may use accent colors as broad chapter fields; Operate and Read reserve them for actions, states, callouts and orientation.

## Typography

**Display Font:** Geist with Arial fallback
**Body Font:** Geist with Arial fallback
**Label/Mono Font:** Geist Mono with Consolas fallback

**Character:** Geist is contemporary, blunt and highly readable. Heavy, tightly tracked display type supplies the gaming-community energy; regular body text keeps the product credible. Geist Mono is functional evidence for code, identifiers, timestamps and tabular data, not a decorative technology costume.

### Hierarchy

- **Display:** Black, responsive 48–96px, compressed line-height. Reserved for the first promise or one campaign-scale conclusion.
- **Headline:** Black, responsive 36–60px. Major section conclusions and category introductions.
- **Title:** Bold, 24px. Product areas, workflow steps, cards and reading-section titles.
- **Body:** Regular, 18px with open leading. Persuasive and explanatory copy; keep prose near 64–72 characters per line.
- **Label:** Bold, 14px. Navigation, captions, controls and compact status language.
- **Mono:** Medium, 14px. Code, IDs, timestamps, key-value facts and developer-facing syntax.

### Named Rules

**The One Heavy Voice Rule.** Use at most one display-scale statement in a viewport; supporting hierarchy must step down decisively.

**The Mono Is Evidence Rule.** Use Geist Mono only when the content is intrinsically machine-readable or tabular.

## Layout

The domain uses a shared 4px spatial base. Marketing layouts expand through 24, 48, 64 and 96px intervals; product layouts concentrate around 4, 8, 12 and 24px; reading layouts use 16, 24, 32 and 48px to sustain comprehension.

The landing frame is 90–96rem wide with 20px mobile, 32px tablet and 48px desktop gutters. Broad chapters sit inside the dark page with 16px mobile and 28px desktop corners. Split compositions become a single ordered stream below 1024px, with screenshots always remaining within the viewport.

Mode adaptations:

- **Persuade — landing:** oversized claims, broad alternating chapter surfaces, generous negative space and one continuous signal route.
- **Operate — web:** persistent shell, compact controls, strong row alignment and predictable density. Signal geometry appears in branding, focus, status and empty states rather than behind working data.
- **Read — wiki and developer:** article columns stay near 72 characters, navigation remains stable and callouts use quiet tonal surfaces. Signal routes may separate major regions but never cross prose or code.

**The Shared Datum Rule.** Align each major block to the page frame, shell rail, article column or an established split line; avoid isolated floating containers.

## Elevation & Depth

The system is flat by default. Solid color changes, overlap, borders and directional composition establish hierarchy before shadows. Shadows are soft and directional, never neon glows: product windows receive the strongest depth, sticky navigation receives a shallow ambient shadow and overlays receive a clear detached shadow.

### Shadow Vocabulary

- **Product Hero:** A broad 18px by 24px dark offset with 64px blur for the primary product proof.
- **Product Standard:** A 14px by 18px dark offset with 48px blur for secondary screenshots.
- **Sticky Header:** A shallow 8px downward ambient shadow with 28px blur.
- **Overlay:** A compact 10px by 14px detached shadow with 32px blur for consent and errors.

### Named Rules

**The Flat First Rule.** A surface must work through color, alignment and spacing before it earns a shadow.

**The Evidence Is Not Wallpaper Rule.** Screenshots remain upright, readable and unretouched inside explicit product windows; never blur, tint or use them as backgrounds.

## Shapes

Corners are soft but controlled. Controls use 12px corners, product windows use 16px and campaign chapters reach 28px. Circles belong to the signal system: Resp Orbit, route nodes, timer rings and compact status indicators. Ordinary containers do not become pills, bubbles or ornamental blobs.

The signal route uses thick rounded strokes connected by deliberate bends and circular nodes. It may change color and scale, but its geometry stays recognizable across the domain. Resp Orbit always preserves Night Ink, lime orbit, cyan endpoint and amber center; the 16px favicon may omit the center for clarity.

**The Instrument, Not Toy Rule.** Playfulness comes from scale, route geometry and color—not from cartoon controls, excessive rounding or decorative mascots.

## Components

### Brand Lockup

- **Shape:** Resp Orbit at 24–32px beside the existing Lootlog wordmark with an 8px gap.
- **Color:** Use the canonical four-color mark on Night Ink. Do not recolor individual parts per surface.
- **Use:** Full lockup in headers and footers; symbol-only in constrained rails, favicons and app icons.

### Buttons

- **Shape:** Soft rectangular controls with 12px corners and 44–56px height.
- **Primary:** Signal White on Night Ink for the principal installation path.
- **Brand:** Broadcast Cobalt with Signal White for opening or continuing into Lootlog.
- **Signal:** Resp Lime with Night Ink for compact, high-confidence actions.
- **Hover / Active:** Slight tonal change and at most a 2px upward hover translation; active returns to baseline.
- **Focus:** A visible 2px signal-colored ring with generous offset. Disabled and loading states retain size and accessible naming.

### Navigation

- **Style:** Night Ink, stable placement and the Resp Orbit lockup. Text is compact, bold and quiet until hover or active state.
- **Operate:** The symbol may lead a narrow rail while labels live in the adjacent navigation area.
- **Read:** Keep the header visually quieter than the article and preserve obvious current-location states.

### Product Windows

- **Corner Style:** 16px with a 36px dark title bar and three small coral, amber and lime indicators.
- **Background:** The deepest Night Ink variant.
- **Image:** Current, unretouched product UI using a controlled aspect-ratio viewport and top alignment.
- **Depth:** Product Standard by default; Product Hero only for the primary proof.

### Broadcast Chapters

- **Shape:** Broad 16–28px rounded fields, never a grid of equal feature cards.
- **Color:** One dominant chapter color with high-contrast text.
- **Composition:** Copy and evidence alternate across a shared frame; signal geometry supports the reading direction.

### Signal Route

- **Style:** Thick, round-capped path with one emphasized node and an optional outer pulse.
- **Motion:** Only the hero route draws and pulses. Other routes are static.
- **Accessibility:** Always decorative and hidden from assistive technology; reduced motion disables drawing, pulsing and transform emphasis.

### FAQ / Disclosure Rows

- **Style:** Open full-width rows separated by Rule Blue rather than individual cards.
- **State:** Lime hover and focus, clear chevron rotation and body text constrained to readable measure.

## Do's and Don'ts

### Do:

- **Do** use Resp Orbit and the Lootlog wordmark as the stable anchor across every domain surface.
- **Do** adapt expression to Persuade, Operate or Read mode while preserving the same tokens and signal grammar.
- **Do** let current product screenshots, real data and code examples carry the proof.
- **Do** use accent colors to communicate synchronization, time, priority, error or action.
- **Do** preserve keyboard focus, reduced-motion behavior and responsive single-column order.

### Don't:

- **Don't** bring back pixel-art chests, fantasy parchment, characters, 3D renders or generic AI imagery.
- **Don't** use purple ambience, glassmorphism, gradient text or neon glow as a substitute for hierarchy.
- **Don't** turn working product screens or documentation into marketing chapter layouts.
- **Don't** crop, rotate, blur, tint or redraw real product screenshots for visual effect.
- **Don't** add bento grids, equal feature-card collections or arbitrary decorative nodes.
