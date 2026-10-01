---
name: Obsidian Glass UI
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353942'
  surface-container-lowest: '#0a0e16'
  surface-container-low: '#181c24'
  surface-container: '#1c2028'
  surface-container-high: '#262a33'
  surface-container-highest: '#31353e'
  on-surface: '#dfe2ee'
  on-surface-variant: '#c0c6d6'
  inverse-surface: '#dfe2ee'
  inverse-on-surface: '#2c3039'
  outline: '#8b91a0'
  outline-variant: '#414754'
  surface-tint: '#aac7ff'
  primary: '#aac7ff'
  on-primary: '#003064'
  primary-container: '#3e90ff'
  on-primary-container: '#002957'
  inverse-primary: '#005db8'
  secondary: '#47e266'
  on-secondary: '#003910'
  secondary-container: '#09bf49'
  on-secondary-container: '#004615'
  tertiary: '#ffb868'
  on-tertiary: '#482900'
  tertiary-container: '#ce7f00'
  on-tertiary-container: '#3f2300'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#00468d'
  secondary-fixed: '#6cff82'
  secondary-fixed-dim: '#47e266'
  on-secondary-fixed: '#002106'
  on-secondary-fixed-variant: '#00531a'
  tertiary-fixed: '#ffddbb'
  tertiary-fixed-dim: '#ffb868'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#0f131c'
  on-background: '#dfe2ee'
  surface-variant: '#31353e'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.015em
  title-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.012em
  title-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: -0.003em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.0em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  margin: 1.5rem
  gutter-mobile: 0.75rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system channels the refined, precision-engineered aesthetic of modern Apple desktop and mobile operating systems, tuned for a high-density, critical smart building administration environment. It pairs deep, light-absorbing obsidian slate foundations with luminous frosted glass overlays, atmospheric optical refractions, and surgical Apple-inspired functional accents.

The emotional tone balances absolute operational authority with effortless executive elegance:
- **Atmospheric & Immersive:** Ambient dark canvas minimizes visual fatigue during continuous monitoring while granting priority to live telemetry.
- **Architectural Depth:** Layered translucent surfaces simulate physical optical glass sheets floating above real-time hardware activity.
- **Precision Engineering:** Micro-radii, 1-pixel sub-surface highlights, and tight typographic tracking create a zero-slack, premium enterprise software feel.

## Colors

The palette is engineered around dark ambient surfaces, crisp optical borders, and vivid status indicators matching Apple's dynamic system accents:

- **Core Canvas (`#0B0F17`):** The primary root substrate. Absorbent, low-noise dark slate-graphite.
- **Elevated Canvas (`#111827`):** Recessed panels, data table bases, and inactive state wells.
- **Primary Accent (`#0A84FF`):** System focus states, interactive controls, active navigation indicators, and primary action triggers.
- **Operational Status Palette:**
  - **Success / Online (`#30D158`):** Verified resident entries, active IoT nodes, normal gate operations.
  - **Warning / Degraded (`#FF9F0A`):** Door hold-open timeouts, scheduled maintenance warnings, pending deliveries.
  - **Critical / Denied (`#FF453A`):** Unauthorized badge scans, tamper triggers, offline camera hubs.
- **Translucent Fill Tokens:**
  - `surface-glass`: `rgba(255, 255, 255, 0.05)` to `rgba(255, 255, 255, 0.08)`
  - `surface-glass-active`: `rgba(255, 255, 255, 0.12)`
  - `surface-glass-border`: `rgba(255, 255, 255, 0.12)` with optical top edge highlight `rgba(255, 255, 255, 0.18)`

## Typography

Typography establishes an Apple-like structural rigor using tightly tracked sans-serif forms:

- **Negative Tracking on Scale:** Negative letter spacing increases progressively from body text through headlines to retain cohesive density on dark backgrounds.
- **Status Tags & Micro-Labels:** `label-sm` utilizes uppercase rendering with `0.04em` expanded tracking to ensure maximum legibility across small security tags and card subheadings.
- **Hardware Telemetry:** Numeric data metrics, MAC addresses, device tokens, and log timecodes use `code-sm` with monospace tabular figures (`font-feature-settings: 'tnum' 1`) to eliminate character jitter during live streaming updates.

## Layout & Spacing

The layout is built on a responsive 12-column grid anchored by a persistent macOS-style utility rail:

- **Desktop (>= 1280px):** 12 columns, 260px fixed glass sidebar, 1.25rem gutters, and 1.5rem container margins.
- **Tablet (768px - 1279px):** Collapsed 72px icon-only glass rail, 8-column layout, 1rem gutters, 1.25rem outer margins.
- **Mobile (< 768px):** Single column fluid stack, fixed bottom translucent glass command bar, 0.75rem gutters, 1rem outer canvas margins.
- **Internal Padding Rhythm:** Metric cards and data views follow an 8-point density scale (`space-sm` for compact control groups, `space-md` for standard card interior pads, `space-lg` for dashboard sections).

## Elevation & Depth

Visual depth is achieved through optical materials and light physics rather than muddy black drop shadows:

- **Surface Translucency:** Primary panels and overlay cards utilize `backdrop-filter: blur(24px) saturate(180%)` combined with `background: rgba(17, 24, 39, 0.65)`.
- **Sub-Surface Edge Light:** Panels feature a hairline stroke (`1px solid rgba(255, 255, 255, 0.10)`). Floating modals and high-priority cards add an inset highlight gradient (`box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.15)`).
- **Z-Index Layer Hierarchy:**
  - **Base (Z-0):** Obsidian backdrop with subtle radial glow behind critical metrics.
  - **Content Surface (Z-10):** Translucent frosted cards, dashboard sections.
  - **Navigation & Sticky Rails (Z-20):** Frosted glass sidebar and top bar (`backdrop-filter: blur(32px)`).
  - **Floating Overlays & Menus (Z-30):** Dropdown contextual popovers, segmented selector overlays (`box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45)`).
  - **Inspection Sheets & Modals (Z-40):** High-blur dark scrim with illuminated center console.

## Shapes

The design system employs continuous super-ellipse (squircle) rounding:

- **Standard Elements (`0.5rem` / `rounded-md`):** Input fields, inline table action buttons, segmented control items.
- **Cards & Data Modules (`1rem` / `rounded-lg`):** Overview metric panels, log cards, camera preview nodes.
- **Overlays & Dialogs (`1.5rem` / `rounded-xl`):** Access control configuration drawers, system alert modals.
- **Pill Badges (`9999px` / `rounded-full`):** State indicators, live streaming tags, avatar wrappers, segmented control track envelopes.

## Components

### Buttons
- **Primary:** Background `#0A84FF` with top edge reflection `inset 0 1px 0 rgba(255, 255, 255, 0.25)`, white bold text, slight brightness boost on hover.
- **Glass / Secondary:** `rgba(255, 255, 255, 0.08)` fill, `1px solid rgba(255, 255, 255, 0.12)` border, `color: #F3F4F6`. Hover triggers `rgba(255, 255, 255, 0.14)` fill.
- **Destructive / Override:** `rgba(255, 69, 58, 0.15)` fill with `#FF453A` border and label.

### Segmented Controls
- Continuous dark recessed track (`rgba(0, 0, 0, 0.35)`), enclosing a sliding pill slider with `background: rgba(255, 255, 255, 0.14)`, `box-shadow: 0 2px 8px rgba(0,0,0,0.3)`.

### Metric Summary Cards
- Translucent container with blur, top inset edge light, and an integrated status sparkline.
- Includes a live telemetry pulse: a dual-ring animated beacon (e.g., `#30D158` core with an outer ring pulsing from `0.6` to `0` opacity).

### Status Pill Badges
- Compact capsules with monospace uppercase text (`label-sm`).
- **`ENTRY / ACTIVE`:** `background: rgba(48, 209, 88, 0.12)`, `border: 1px solid rgba(48, 209, 88, 0.25)`, `color: #30D158`.
- **`DENIED / OFFLINE`:** `background: rgba(255, 69, 58, 0.12)`, `border: 1px solid rgba(255, 69, 58, 0.25)`, `color: #FF453A`.
- **`WARNING`:** `background: rgba(255, 159, 10, 0.12)`, `border: 1px solid rgba(255, 159, 10, 0.25)`, `color: #FF9F0A`.

### Tables & Log Streams
- Borderless table layouts utilizing alternating translucent rows (`rgba(255, 255, 255, 0.02)`).
- Hover row state renders smooth `rgba(255, 255, 255, 0.06)` activation with a 1px vertical accent bar on the left edge.

### Checkboxes, Toggles & Radios
- **Toggle Switch:** macOS style smooth pill with fluid spring animation. Active track in `#30D158` or `#0A84FF`, knob in `#FFFFFF` with drop shadow `0 2px 4px rgba(0,0,0,0.4)`.
- **Checkbox:** Rounded 4px container, dark fill with `#0A84FF` check mark on active state.