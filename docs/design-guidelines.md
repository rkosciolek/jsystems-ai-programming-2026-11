# Design Guidelines — corporate engineering brand reference

Extracted on 2026-11-25 from the live homepage of a corporate engineering company using the `create-design-system` skill, then anonymised: the source name, logos, favicon, slogans, people, customers and figures are removed. Only the visual language remains. Machine-readable values live in [`assets/design-tokens.json`](../assets/design-tokens.json); this document explains how to use them.

> **Rights notice:** Noto Sans is published by Google under the SIL Open Font License 1.1. The files in `assets/fonts/` were copied from the reference site's CDN, so confirm the license before you redistribute them. The same family is also available from Google Fonts. The app needs its own logo; none is included.

## Assets

| Asset | Path | Notes |
|---|---|---|
| Homepage reference (full page) | [`assets/homepage.png`](../assets/homepage.png) | 1905×4116, captured in a 1920×1080 viewport, no overlays. Anonymised: logo placeholders, neutral copy, blurred photos and video. |
| Homepage reference (above the fold) | [`assets/homepage-hero.png`](../assets/homepage-hero.png) | 1920×1080, the first screen a desktop user sees (header, hero, intro) |
| Design tokens | [`assets/design-tokens.json`](../assets/design-tokens.json) | Colors, type, spacing, radii, components |
| Fonts | [`assets/fonts/notosans/`](../assets/fonts/notosans/) | Noto Sans in 5 weights, Latin subset (see Typography) |

Blurred areas in the screenshots stand for photography or video. Judge their placement, size and corner treatment, not their content.

## Colors

| Token | Hex | Usage |
|---|---|---|
| `brand.primary` / `text.primary` | `#003963` | Navy. Headings, nav links, body copy in cards, footer background, icon buttons. The dominant brand color. |
| `text.secondary` | `#515D6A` | Slate grey. Default body text, card titles, inactive language switch |
| `brand.accent` | `#0096E0` | Sky blue. Button borders, dates, highlighted numbers |
| `brand.accentLight` / `border.default` | `#85D2F1` | Light-blue borders and dividers |
| `brand.highlight` | `#CC1D56` | Magenta. Hashtags, "Read more" chevrons, the sector-tab underline, the back-to-top button. Use sparingly, as a signal color only. |
| `brand.steel` / `text.muted` | `#788CAA` | Blue-grey second line in two-tone display headlines |
| `background.default` | `#FEFEFE` | Page background |
| `background.surface` | `#FFFFFF` | Header, buttons, cards |
| `background.light` | `#E9F4FD` | Pale-blue section bands (careers teaser, tabs) |
| `background.tint` | `#D3E9FA` | Active or alternating tab background |
| `background.dark` | `#003963` | Footer and newsletter band |
| `text.onDark` | `#FFFFFF` | Text on navy and on hero imagery |

The reference site has no visible error or success colors. The tokens reuse magenta `#CC1D56` for errors. Success `#208A20` comes from a consent widget's confirmation style, so treat it as provisional.

## Typography

**Family:** `"NotoSans", Arial, sans-serif` for everything. The source site registers the heavier cuts as separate family names (`NotoSans-Medium`, `NotoSans-Black`) as well as weight-mapped `NotoSans` faces. In the app, prefer one `NotoSans` family with numeric weights.

Downloaded files. Each is the *main* subset, covering Basic Latin, Latin-1, Latin Extended-A/B (including Polish diacritics) and Cyrillic:

| Weight | File |
|---|---|
| Light 300 | `assets/fonts/notosans/NotoSans-Light.main.woff2` |
| Regular 400 | `assets/fonts/notosans/NotoSans-Regular.main.woff2` |
| Medium 500 | `assets/fonts/notosans/NotoSans-Medium.main.woff2` |
| Bold 700 | `assets/fonts/notosans/NotoSans-Bold.main.woff2` |
| Black 900 | `assets/fonts/notosans/NotoSans-Black.main.woff2` |

Verify the font license before production use (see the rights notice above).

Suggested `@font-face` (one per weight under one family):

```css
@font-face {
  font-family: "NotoSans";
  src: url("../assets/fonts/notosans/NotoSans-Regular.main.woff2") format("woff2");
  font-weight: 400; font-style: normal; font-display: swap;
}
/* repeat for Light 300, Medium 500, Bold 700, Black 900 */
```

| Role | Size / line-height | Weight | Color | Notes |
|---|---|---|---|---|
| Hero title (`h1`) | 55px / 65px | Black 900 | `#FFFFFF` on imagery | Uppercase copy, letter-spacing 1px |
| Display headline | 56px / 56px | Bold 700 | `#003963` + `#788CAA` | Two-tone, uppercase, stacked over two lines |
| Page intro (`h2`) | 55px | Regular 400 | `#003963` | Light and airy, sentence case |
| Section title (`h2`) | 45px / 55px | Medium 500 | `#003963` | Sentence case |
| Card title | 22px / 28px | Bold 700 | `#515D6A` | Letter-spacing 0.6px |
| Body | 18px / 28.8px (1.6) | Regular 400 | `#515D6A` | Base size is 18px |
| Nav link | 18px / 24px | Regular 400 | `#003963` | Letter-spacing 0.5px, sentence case |
| Small / meta | 16px | Regular 400 | various | Language switch, footer links, ticker |
| Fine print | 14.4px / 23px | Regular 400 | `#FFFFFF` | Footer body |

## Spacing

The site uses a loose 8px base with generous vertical rhythm:

- `4 / 8 / 12 / 16 / 24 / 32px` for component internals (button vertical padding is 8px, nav link vertical padding is 16px)
- `22px` below the hero title and `32px` above a CTA button
- `50px` horizontal button padding gives the pill shape its width
- Large sections separate with roughly 100–240px of whitespace. The footer has 240px of top padding.

Layout: content container max-width **1360px**. Intro and text columns are narrower, at **960px**. The sticky header is **80px** tall. At 1920px the container stays centred with wide white margins. Full-bleed elements (hero, the four-up tab strip, the careers band, the footer) span the whole viewport.

## Border radius

| Token | Value | Usage |
|---|---|---|
| `none` | `0px` | Default. Sections, tabs and header are square. |
| `card` | `0 15px 0 0` | **Signature shape**: images and cards round only the top-right corner |
| `cardAlt` | `0 0 0 12px` | Mirrored variant, bottom-left corner only |
| `pill` | `22px` | All text buttons |
| `circle` | `50%` | Slider arrows, back-to-top button |

## Components

- **Header:** white, sticky, 80px. Logo slot on the left. On the right, a utility row (small ticker with a trend icon in navy Bold 16px, `DE | EN` language switch) above the main nav. A navy "Search" tab hangs below the header's right edge.
- **Nav:** sentence-case links, 18px Regular, navy `#003963`, letter-spacing 0.5px, no underline.
- **Primary button:** outlined pill. White fill, 1px `#0096E0` border, navy Bold 18px text, padding `8px 50px`, radius 22px, height 47px. A small variant uses 14.4px text and an optional leading icon. The reference has no filled buttons; keep CTAs outlined.
- **Icon button:** navy circle with a white chevron (slider prev/next). The back-to-top button is a magenta circle.
- **Tab strip:** four equal-width, full-bleed tabs on alternating pale blues (`#D3E9FA` / `#E9F4FD`) with a thin magenta bottom rule. Centred navy 18px labels sit above tall photos.
- **News card:** image with the `0 15px 0 0` corner. Below it: a sky-blue date (`#0096E0`, 18px), a slate Bold 22px title, justified navy body text, and a right-aligned "Read more" link with a magenta chevron. Cards scroll horizontally in a slider.
- **Careers teaser:** pale-blue band with a cut-out people photo on the left. On the right: a two-tone uppercase display headline (navy, then steel), a magenta hashtag line and an outlined CTA. Faint white line-art decorates the band.
- **Footer:** navy `#003963`. A centered newsletter line with a small pill button, social icons in white, white 16px links, a light logo slot bottom-right and a copyright line.
- **Hero:** full-width photography or video ending in a soft white wave curve with layered translucent edges, and a white Black-weight uppercase title on top.

## Logo placement

No logo is included; the app uses its own. In the reference screenshots, dashed `LOGO` boxes mark the slots:

- **Header**, top-left, about 150×70px, on white. Use a dark (navy) version of the app logo.
- **Footer**, bottom-right, on navy. Use a white or inverted version.

## Visual style summary

The style is calm, engineering-led and premium. A deep navy carries almost everything, set against generous white space and pale-sky blues that evoke flight. Typography is a single humanist sans (Noto Sans) used across a wide weight range, from Light intro statements to Black uppercase hero lines. Shapes are mostly square, with two deliberate softeners: pill-shaped outlined buttons and a single rounded top-right corner on imagery. Magenta is the only warm accent and is reserved for small signals such as hashtags, chevrons and dividers. That restraint keeps the overall tone technical and trustworthy.
