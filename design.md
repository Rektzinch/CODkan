# Design — CODkan

A locked design system for the CODkan application. All interface work should
preserve the local-marketplace character, transaction clarity, and mobile-first
rhythm defined here.

## Genre

Playful, restrained, and utilitarian. The interface should feel friendly to a
non-technical local buyer or seller without becoming childish or decorative.

## Macrostructure family

- Marketing surfaces: no in-app marketing hero; use compact product proof only.
- App surfaces: Workbench shell with a discovery feed, task-focused forms, and
  activity sections that flatten nested card layers.
- Content surfaces: Long Document rhythm for guidance, safety, and account help.

## Theme

- `--color-paper`: `oklch(98% 0.009 45)`
- `--color-paper-2`: `oklch(96% 0.014 45)`
- `--color-ink`: `oklch(20% 0.035 265)`
- `--color-ink-2`: `oklch(31% 0.03 265)`
- `--color-rule`: `oklch(88% 0.018 45)`
- `--color-accent`: `oklch(64% 0.205 28)`
- `--color-focus`: `oklch(58% 0.205 28)`

Koral is a signal colour, not a large surface. Navy carries primary actions and
price hierarchy; warm paper keeps the marketplace approachable.

## Typography

- Display: Bricolage Grotesque, weight 700, normal style — distinctive without sacrificing marketplace clarity.
- Body: Geist, weight 400.
- Display tracking: `-0.03em`.
- Type scale: major-third-inspired, anchored at a 16 px body.
- Prices and counts always use tabular numerals.

## Spacing

Use the named 4-point scale in `tokens.css`. App content starts at 16 px mobile
padding, reaches 24 px on tablet, and 32 px on desktop. Components use varied
internal spacing while sibling groups use `gap`.

## Motion

- Easings: `--ease-out`, `--ease-in`, and `--ease-in-out` from `tokens.css`.
- Use only opacity and transform for spatial motion.
- Primary action press, notification sheet entrance, and card hover are the only
  default motion primitives.
- Reduced motion collapses spatial movement to a 120–150 ms opacity change.

## Microinteractions stance

- Focus is immediate and visible.
- Touch targets are at least 44 × 44 CSS px.
- Success is silent when the result is already visible.
- Errors name what failed and what to do next.
- No hover-only controls.

## CTA voice

- Primary: navy fill, warm-paper text, 10 px radius, specific verb.
- Secondary: paper surface, ink text, hairline border.
- Destructive: danger-soft surface and explicit destructive verb.

## Per-page allowances

- Discovery may use real listing imagery and the existing CODkan character asset
  only in empty/loading states.
- App task screens do not use decorative enrichment.
- Safety content is typography-first.

## What pages MUST share

- CODkan lockup and the coral/navy/warm-paper palette.
- Bricolage Grotesque display + Geist body pairing.
- 48 px form controls and consistent focus treatment.
- Bottom navigation on mobile and compact top navigation on larger screens.
- Price → item → location → metadata hierarchy.

## What pages MAY differ on

- Feed density and grid count.
- Activity section arrangement.
- Whether a task uses a panel, sheet, or full-width form.

## Exports

### `tokens.css`

`tokens.css` at the project root is the source of truth and is imported by the
application UI stylesheet.

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(98% 0.009 45);
  --color-paper-2: oklch(96% 0.014 45);
  --color-paper-3: oklch(92.5% 0.018 45);
  --color-ink: oklch(20% 0.035 265);
  --color-ink-2: oklch(31% 0.03 265);
  --color-rule: oklch(88% 0.018 45);
  --color-muted: oklch(49% 0.02 265);
  --color-accent: oklch(64% 0.205 28);
  --color-focus: oklch(58% 0.205 28);
  --font-display: var(--font-bricolage), ui-sans-serif, sans-serif;
  --font-body: var(--font-geist), ui-sans-serif, sans-serif;
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-md: 1.125rem;
  --text-lg: 1.375rem;
  --text-xl: 1.75rem;
  --radius-card: 0.75rem;
  --radius-input: 0.625rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(98% 0.009 45)", "$type": "color" },
    "paper-2": { "$value": "oklch(96% 0.014 45)", "$type": "color" },
    "ink": { "$value": "oklch(20% 0.035 265)", "$type": "color" },
    "muted": { "$value": "oklch(49% 0.02 265)", "$type": "color" },
    "rule": { "$value": "oklch(88% 0.018 45)", "$type": "color" },
    "accent": { "$value": "oklch(64% 0.205 28)", "$type": "color" },
    "focus": { "$value": "oklch(58% 0.205 28)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Bricolage Grotesque, ui-sans-serif, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "Geist, ui-sans-serif, sans-serif", "$type": "fontFamily" }
  },
  "space": {
    "xs": { "$value": "0.5rem", "$type": "dimension" },
    "sm": { "$value": "0.75rem", "$type": "dimension" },
    "md": { "$value": "1rem", "$type": "dimension" },
    "lg": { "$value": "1.5rem", "$type": "dimension" },
    "xl": { "$value": "2rem", "$type": "dimension" }
  },
  "duration": {
    "micro": { "$value": "120ms", "$type": "duration" },
    "short": { "$value": "220ms", "$type": "duration" },
    "long": { "$value": "420ms", "$type": "duration" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 98% 0.009 45;
  --foreground: 20% 0.035 265;
  --card: 99% 0.006 45;
  --card-foreground: 20% 0.035 265;
  --popover: 99% 0.006 45;
  --popover-foreground: 20% 0.035 265;
  --primary: 20% 0.035 265;
  --primary-foreground: 98% 0.009 45;
  --secondary: 96% 0.014 45;
  --secondary-foreground: 31% 0.03 265;
  --muted: 92.5% 0.018 45;
  --muted-foreground: 49% 0.02 265;
  --accent: 64% 0.205 28;
  --accent-foreground: 20% 0.035 265;
  --destructive: 54% 0.19 27;
  --destructive-foreground: 98% 0.009 45;
  --border: 88% 0.018 45;
  --input: 88% 0.018 45;
  --ring: 58% 0.205 28;
  --radius: 0.75rem;
}
```
