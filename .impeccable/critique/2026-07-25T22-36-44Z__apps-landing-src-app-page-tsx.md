---
target: landing page
total_score: 19
max_score: 32
na_heuristics: 5,7
p0_count: 0
p1_count: 4
timestamp: 2026-07-25T22-36-44Z
slug: apps-landing-src-app-page-tsx
---

# Lootlog Landing Page Critique

## Design Health Score

| #         | Heuristic                           | Score     | Key Issue                                                                                                                                  |
| --------- | ----------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1         | Visibility of System Status         | 2         | Session loading is visible, but Discord sign-in exposes no failure or recovery state.                                                      |
| 2         | Match Between System and Real World | 3         | The Polish, game-literate language fits Margonem players, but the addon, Tampermonkey, Discord, and dashboard relationship is unexplained. |
| 3         | User Control and Freedom            | 3         | Navigation, collapsible FAQ, and rejectable cookies are clear; mixed same-tab/new-tab behavior weakens predictability.                     |
| 4         | Consistency and Standards           | 3         | The interface is cohesive, with minor inconsistencies in repeated documentation routes and mobile icon-only support.                       |
| 5         | Error Prevention                    | n/a       | No form, editing, or destructive workflow exists on this Persuade surface.                                                                 |
| 6         | Recognition Rather Than Recall      | 2         | Main actions are labeled, but visitors must leave the page to discover prerequisites and the product workflow.                             |
| 7         | Flexibility and Efficiency          | n/a       | Power-user accelerators are not meaningful for this marketing surface.                                                                     |
| 8         | Aesthetic and Minimalist Design     | 2         | The design is clean but generic decoration, excess vertical space, and an obstructive cookie panel weaken focus.                           |
| 9         | Error Recognition and Recovery      | 1         | Discord sign-in has no visible error state, recovery guidance, or fallback.                                                                |
| 10        | Help and Documentation              | 3         | Documentation and FAQ are prominent, but installation help is off-page at the moment of greatest uncertainty.                              |
| **Total** |                                     | **19/32** | **Acceptable — significant persuasion and trust gaps**                                                                                     |

## Design Specificity Verdict

**Low specificity / category-interchangeable.**

### Design assessment

The dark grid, purple-to-pink gradient headline, glass cards, centered hero, testimonials, and FAQ could promote almost any gaming SaaS or Discord utility. Margonem appears mainly in copy. Lootlog's defining mechanism—gameplay observations becoming synchronized guild timers, records, coordination, and analysis—is never visualized. Six real product screenshots already exist, yet the page sells atmosphere instead of the product.

### Deterministic scan

The page wrapper alone returned no findings because it only renders `HomeContent`. Scanning the composed landing component directory returned exactly one CLI finding: `gradient-text` at `apps/landing/src/components/landing/hero-section.tsx:36`. It is a true stylistic positive and reinforces the category-interchangeable verdict, though it is not a functional defect.

The runtime detector reported four anti-patterns: overused computed Roboto, a single computed font family, gradient text, and glowing shadow accents. The single-font finding is a false positive as phrased because hierarchy is created through scale and weight. The Roboto result is more useful as evidence of a possible Geist/token wiring mismatch than as proof that one font is inherently wrong. The modest cookie-button glow is stylistic. A separate line-length overlay on one FAQ answer is low severity.

### Visual overlays

Injection succeeded and the detector rendered overlays in the controlled browser tab. No reliable user-visible **[Human]** overlay is claimed because the selected browser binding exposed no visibility API (`typeof browser.visibility === "undefined"`). The controlled tab showed duplicate gradient labels on the same hero span, a long-line marker on the expanded FAQ answer, and a glow marker on the cookie acceptance button; the duplicate gradient label counts once.

## Overall Impression

The opening is energetic, legible, and immediately actionable, but the page asks visitors to trust a promise it never demonstrates. The single biggest opportunity is to replace generic decorative persuasion with a real proof sequence showing the in-game observation, guild synchronization, and web-dashboard outcome.

## What's Working

- The hero establishes a strong hierarchy and makes installation the unmistakable primary action within seconds.
- The FAQ addresses real adoption objections—ban safety, price, synchronized timers, multiple characters, and support—rather than generic marketing questions.
- The responsive composition avoids horizontal overflow, and mobile FAQ controls are comfortably sized at 52–72 px.

## Cognitive Load

**Moderate: three checklist failures.**

- **Minimal choices:** the desktop first viewport exposes seven routes/actions when repeated Documentation paths are counted; the FAQ and footer each expose six options.
- **Working memory:** newcomers must leave the page and remember context to understand Tampermonkey, Discord authentication, and how the addon feeds the dashboard.
- **Progressive disclosure:** the page does not stage the actual sequence of install, authenticate, play, synchronize, and inspect.
- Single focus, grouping, hierarchy, one-thing-at-a-time, and chunking are otherwise strong.

## Emotional Journey

The hero creates confidence and momentum. The experience then falls into a trust valley: there is no product screenshot or mechanism proof, the confirmed “thousands of users” claim has no supporting evidence on the page, and synthetic-looking avatars make confirmed testimonials feel less credible than they are. The FAQ recovers trust through practical answers, but the page ends on legal and utility links instead of converting that reassurance into a final install or dashboard action. On mobile, the cookie panel repeatedly interrupts the journey and masks content.

## Priority Issues

### [P1] The product is visually absent

**Why it matters:** Visitors cannot see the in-game overlay, synchronized timers, guild workflow, or dashboard, so Lootlog's unique mechanism remains abstract and the surface reads like a generic gaming tool.

**Fix:** Insert a real-product proof sequence before testimonials: in-game observation → guild synchronization → dashboard outcome. Use the existing timers, detector, chat, notifications, roles, and dashboard screenshots with concrete outcome captions. Reduce the gradient/glass decoration once the product itself carries the visual interest.

**Suggested command:** `$impeccable bolder`

### [P1] The adoption path is unexplained

**Why it matters:** “Install,” “Log in,” and repeated Documentation links compete without explaining what gets installed, why Discord is required, or when the dashboard becomes useful.

**Fix:** Add a compact four-step path: install the Tampermonkey userscript, authenticate with Discord, play normally, inspect synchronized guild data. Explicitly distinguish “new player: install” from “returning user: open dashboard.”

**Suggested command:** `$impeccable clarify`

### [P1] Confirmed social proof is presented in a way that feels fabricated

**Why it matters:** The claims and testimonials are confirmed, but generated-avatar conventions, a profanity-led first quote, and an unsubstantiated-on-page “thousands” headline make trustworthy evidence look synthetic or unserious.

**Fix:** Lead with concrete outcome-based quotes, use transparent attribution that does not imitate photographic identity, and pair the usage claim with a visible source, counter, community signal, or other credible proof.

**Suggested command:** `$impeccable clarify`

### [P1] Cookie consent obstructs mobile conversion

**Why it matters:** At 390×844 the fixed panel covers the secondary Documentation CTA and later masks testimonials and FAQ content. Its Accept and Reject controls are 32 px high; header Support is 36 px and Login is 32 px, all below the 44 px touch-target floor.

**Fix:** Replace it with a compact, safe-area-aware bottom bar or sheet with controls at least 44 px high, reduced copy, and a maximum height that cannot cover both hero actions.

**Suggested command:** `$impeccable adapt`

### [P2] The page has no persuasive ending

**Why it matters:** The FAQ resolves the strongest objections, then the footer disperses attention across six low-priority destinations instead of completing the decision.

**Fix:** Add a final trust recap—free, open source, no gameplay automation—with a role-aware install/dashboard CTA before the footer.

**Suggested command:** `$impeccable layout`

## Persona Red Flags

### Jordan — first-time addon user

Jordan understands “loot and timers” but not what is installed, why Discord is needed, or how the addon and dashboard connect. Install, Login, and repeated Documentation links present competing paths without sequencing. No product preview answers “what will I actually get?”

### Riley — deliberate trust tester

Riley sees synthetic-looking avatars beside testimonial claims, a “thousands” claim without visible substantiation, and no recovery UI if Discord sign-in fails. In the inspected local build, the install URL resolves to `http://localhost:5173`, which also deserves environment validation before release.

### Casey — distracted mobile visitor

At 390×844 the consent panel hides the Documentation CTA and masks later content. Consent buttons are 32 px high, Support is 36 px, and Login is 32 px. The primary install CTA is comfortably sized at 217×56 px, but the secondary path is effectively unavailable until consent is handled.

### Michał — guild leader evaluating adoption

Michał needs proof that timers synchronize across a guild, how roles and permissions work, what members must install, and what coordination improves. The page offers no workflow demonstration, guild-level outcome, or screenshot sequence, so he cannot justify asking the guild to adopt it.

## Minor Observations

- On mobile, the headline wrap isolates “nad,” making the composition feel breakpoint-driven rather than intentionally typeset.
- “Częste pytania” would read more naturally as “Najczęstsze pytania.”
- “Zainstaluj Dodatek” and “Lootami i Timerami” use title-style capitalization that feels imported rather than natural in Polish UI copy.
- Desktop sections have excessive empty vertical intervals.
- Documentation appears in the header, hero, and footer without differentiated intent.
- Mobile hides Docs and GitHub while retaining Support and Login, prioritizing funding/account access over learning.
- The layout declares Geist font variables, while the runtime detector computed Roboto for 100% of visible text; confirm whether the shared `font-sans` token is wired as intended.

## Questions to Consider

- If six real product screenshots already exist, why is the product itself invisible?
- Which visitor should win the first screen: a new installer or a returning dashboard user?
- Should the loudest proof point be a profanity-led joke, or a measurable guild outcome?
- Could a guild leader explain Lootlog's shared-data mechanism after ten seconds on this page?
- If ban safety, free pricing, and open source are the strongest trust facts, why are they buried in FAQ instead of supporting the first CTA?
