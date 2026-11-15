# Dirghayu Brand Guidelines

## Logo

### Concept
A pointed temple-style arch woven from vibrant Indian cloth, with the Latin letter "D" stitched on a cream patch in the middle. It feels respectful, warm, and positive toward elders.

### Variants
1. **Mark only** (`public/logo-mark.svg`, `src/app/icon.svg` for favicon) - The arch with cloth texture and centered D
2. **Lockup** (`public/logo.svg`) - Mark + "Dirghayu" (Fraunces) + "दीर्घायु" (Noto Serif Devanagari) + 5-color stripe divider + tagline

### Logo Construction (Mark)
- **ViewBox**: 0 0 320 380
- **Arch clipPath**: `M16 372V172C16 96 76 44 160 10C244 44 304 96 304 172V372Z`
- **Arch fill**: Rani pink `#D81B60`
- **Side stripes (left)**: Saffron `#FF9933` (16-34), Cream `#FBF3E4` (34-42), Peacock teal `#00838F` (42-56)
- **Side stripes (right, mirrored)**: Peacock teal (264-278), Cream (278-286), Saffron (286-304)
- **Bottom band**: Indigo `#2E3A8C` (y330-372) with bandhani dot pattern (cream diamond + marigold center, 18px tile)
- **Top bindu**: Marigold `#FFB300` circle r6.5 inside cream `#FBF3E4` ring r12 at (160, 52)
- **Centre patch**: Pointed arch `M70 330V190C70 138 108 100 160 76C212 100 250 138 250 190V330Z` filled cream with marigold 10px stroke, inner dashed running-stitch outline (rani pink, stroke-dasharray 6 4)
- **Letter D**: Centered at (160, 268), Fraunces serif weight 700, font-size 170, deep maroon `#5B1033`
- **Cloth texture**: Warp (3px tile, thin dark vertical lines, ~11% opacity), Weft (thin light horizontal lines, ~14% opacity), feTurbulence fractalNoise grain filter

### Favicon
- Flat version of arch + D (`src/app/icon.svg`), viewBox 0 0 32 32
- No texture, no tiny details, legible at 32px
- Simplified stripes, solid stitch line

### Usage Rules
- Always use the provided SVG files - do not recreate
- Mark variant: minimum 32px width
- Lockup variant: minimum 200px width
- Maintain clear space equal to the height of the "D" on all sides
- Never place on busy backgrounds without the arch clip boundary
- Never recolor - use the defined palette

## Color Palette

| Name | Hex | CSS Variable | Tailwind Class | Usage |
|------|-----|--------------|----------------|-------|
| Saffron | #FF9933 | `--color-saffron` | `saffron` | Accent, energy, side stripes |
| Rani Pink | #D81B60 | `--color-rani-pink` | `rani-pink` | Primary, arch fill, primary actions |
| Peacock Teal | #00838F | `--color-peacock-teal` | `peacock-teal` | Secondary, trust, side stripes |
| Marigold | #FFB300 | `--color-marigold` | `marigold` | Highlight, bindu, strokes |
| Indigo | #2E3A8C | `--color-indigo` | `indigo` | Bottom band, depth |
| Cream | #FBF3E4 | `--color-cream` | `cream` | Background, patch, rings |
| Deep Maroon | #5B1033 | `--color-deep-maroon` | `deep-maroon` | Letter D, primary text on cream |
| Deep Teal | #00606B | `--color-deep-teal` | `deep-teal` | Body text, lockup text |

### Semantic Aliases (Tailwind)
- `primary` / `primary-foreground` - Rani pink / Cream
- `secondary` / `secondary-foreground` - Peacock teal / Cream
- `accent` / `accent-foreground` - Saffron / Deep maroon
- `background` - Cream
- `foreground` - Deep teal
- `muted` / `muted-foreground` - Marigold / Deep maroon
- `border` - Rani pink
- `ring` - Peacock teal

## Typography

### Fonts (Google Fonts, open license)
- **Fraunces** (serif, weight 700) - Display headings, "Dirghayu", letter D, tagline
- **Inter** (sans) - UI, body text, buttons, forms
- **Noto Serif Devanagari** (serif, weight 700) - Devanagari "दीर्घायु"

### Scale
| Token | Size/Line Height | Usage |
|-------|------------------|-------|
| display-xl | 4.5rem / 1.1 | Hero headlines |
| display-lg | 3.75rem / 1.1 | Page titles |
| display-md | 3rem / 1.2 | Section headers |
| display-sm | 2.25rem / 1.3 | Card titles |
| heading-xl | 1.875rem / 1.3 | Major headings |
| heading-lg | 1.5rem / 1.4 | Subheadings |
| heading-md | 1.25rem / 1.4 | Component headers |
| heading-sm | 1.125rem / 1.5 | Small headers |
| body-lg | 1.125rem / 1.6 | Lead paragraphs |
| body | 1rem / 1.6 | Default body |
| body-sm | 0.875rem / 1.6 | Secondary text |
| caption | 0.75rem / 1.5 | Captions, labels |

## Tone & Voice

### Core Principles
- **Respectful**: Elders are honored, in charge, living their own lives
- **Positive**: Celebrate autonomy, never frame aging as decline
- **Clear**: Simple language, no jargon, accessible to all ages
- **Warm**: Human, empathetic, never clinical or cold

### Do's
- "Gentle reminder: your medicine is due"
- "You're doing well with your medications"
- "Here's your schedule for today"
- "The elder remains at the center of their care decisions"

### Don'ts
- "Don't forget your pills" (shaming)
- "You missed a dose" (blame)
- "Compliance" (clinical, implies obedience)
- "Patient" (passive) - use "elder" or "person"
- "Elderly" as noun - use "older adults" or "elders"
- Infantilizing language ("sweetie", "honey", oversimplified)

### Email Wording
- Neutral, non-shaming
- "It looks like a dose wasn't recorded" not "You forgot"
- "This reminder supports you" not "You need this"
- Always include manage/unsubscribe links
- List-Unsubscribe header on every email

## Accessibility
- WCAG 2.1 AA minimum
- Color contrast: Deep teal on cream = 7.2:1 ✓, Rani pink on cream = 4.8:1 (large text) ✓
- Focus indicators using `ring` color (peacock teal)
- Semantic HTML, ARIA labels on all interactive elements
- Reduced motion respected
- Scalable text (rem units)

## Implementation Notes
- Colors defined in `tailwind.config.ts` as theme extensions
- Fonts loaded via `next/font` in `src/app/layout.tsx`
- Logo component in `src/components/Logo.tsx` with `mark` and `lockup` variants
- CSS variables available for non-Tailwind contexts