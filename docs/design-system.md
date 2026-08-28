# WayOnTop Brand Design System

This document outlines the official brand style and design system for all WayOnTop applications, including the Consumer and Producer apps.

**CRITICAL DIRECTIVE**: All future UI/UX development MUST follow this brand style. No exceptions. Both Consumer and Producer applications must feel like they were built by the same team, sharing the same premium aesthetic.

## 1. Core Aesthetic
Our design philosophy is anchored in a concept we call **"Prismatic Zen"** (heavily inspired by our brand motion graphics like `parkgif.mp4`). It blends Apple's sleek glassmorphism with an ethereal, luminous, and tranquil zen-garden aesthetic.

- **Theme**: A deep, dark slate foundation brought to life by glowing, iridescent pastel accents (mint green, pearlescent pink, soft lavender, and luminous white orbs).
- **Glassmorphism**: Heavy use of translucent panels (`backdrop-blur-xl`, `bg-white/10`, `border-white/20`) layered *over* the iridescent glowing backgrounds to create depth, resembling frosted glass over glowing crystals.
- **Typography**: Clean, sans-serif fonts (like Inter or San Francisco/Geist), utilizing varied weights for hierarchy (bold white for primary text, slate-300/400 for secondary).
- **Rounding**: Soft, approachable corners. Large border radii on main cards (`rounded-2xl`, `rounded-3xl`, `rounded-[32px]`), pill-shaped buttons (`rounded-full`).

## 2. Design Tokens & Components (`packages/ui`)
All design tokens and `shadcn/ui` components are strictly centralized in the `@wayontop/ui` package to ensure 100% consistency across the monorepo.
- **Component Imports:** Always import components from the shared package: `import { Card } from '@wayontop/ui/components/ui/card'`.
- **Custom Shared Components:** Foundational UI like `PermissionGate.tsx` are also centralized here.

### Brand Identity (Logo & Favicon)
- **Concept:** A minimalist, elegant map pin with a leaf-shaped cutout to represent the Lalbagh Botanical Garden. It uses a clean Emerald Green gradient.
- **Favicon:** Hosted directly at `consumer/public/favicon.svg` and `producer/public/favicon.svg`. These are automatically loaded by the `index.html` files.
- **React Component:** A reusable `<Logo />` component is available in the shared UI package for use in navbars, splash screens, or empty states.
  ```tsx
  import { Logo } from '@wayontop/ui/components/icons/Logo'
  
  // Usage
  <Logo className="w-8 h-8 drop-shadow-md" />
  ```

### Colors
- **Backgrounds**: Deep slate (`bg-slate-950`) acts as the canvas. This is heavily augmented by absolute-positioned glowing orbs using `mix-blend-screen` and `mix-blend-overlay` to create iridescent, holographic backdrops.
- **Primary Accents (The Crystals)**: Ethereal Pastels. We use gradients combining `teal-300/20`, `fuchsia-300/10`, `indigo-400/20`, and `rose-400/20` to mimic the light catching translucent crystals.
- **Action Accents**: Vibrant Emerald/Teal (`emerald-400` to `emerald-600`) remains the primary color for buttons and success states, symbolizing nature and movement.
- **Text**: `text-white` for primary text, `text-slate-300` for subtitles. We also use gradient text (`bg-clip-text text-transparent bg-gradient-to-r from-emerald-200 via-teal-100 to-indigo-200`) for magical or premium headers.
- **Borders**: Luminous and subtle. `border-white/10` or `border-white/20` to define edges of glass panels, catching the "light".

### Utilities
- `.glass-panel`: The workhorse container. Translucent black/grey with background blur and a subtle white border. Used for cards, dialogs, and main UI overlays.
- `.glass-pill`: Similar to `.glass-panel` but heavily rounded (`rounded-full`). Used for floating toolbars and action buttons.

## 3. Micro-Animations & Interactions
A premium app feels alive. Static elements are a failure of design.
- **Hover States**: Elements should slightly brighten (`hover:bg-white/10`).
- **Active States**: Buttons should slightly scale down on press (`active:scale-95`).
- **Animations**:
  - `animate-in zoom-in-95`: Used when panels or modals appear, giving a soft pop.
  - `spring-bounce`: Custom keyframe for delightful, bouncy entrances.
  - `shimmer`: A custom animated sheen (e.g., `animate-[shimmer_1.5s_infinite]`) used on primary buttons to make them feel magical and rewarding.
  - `float`: Custom keyframe for elements like the AR stamp to gently bob up and down.

## 4. UI Components

### Floating Navigation (HUD)
Instead of blocky navbars, we use floating, detached HUD elements (Heads Up Display).
- Controls float above the map/camera view.
- Padded safe areas.
- Blur effects ensure the map/camera remains visible beneath the UI.

### Modals & Dialogs (Sheets)
- Slide in from the bottom or side.
- Transparent dark backgrounds.
- Always include a subtle handle/indicator.

### Maps
- Consistent map skins across apps.
- `animated` (MapLibre vector style with custom color palettes) and `satellite` modes.
- Dark UI overlay works perfectly with both modes.

## 5. Enforcement
When building new features:
1. **Never use standard opaque white backgrounds** (`bg-white` or `bg-slate-50`) for main containers.
2. **Never use generic blue** (`blue-500`) for primary buttons. Use the established Emerald green.
3. **Always use `@wayontop/ui/src/styles/shared.css`**.
4. **Ensure perfectly smooth mobile responsiveness**. Hardcoded pixel widths are discouraged; use flexbox, max-widths, and relative units.
5. **No compromises on performance**. Glassmorphism can be heavy; ensure we use `transform-gpu` and optimize react re-renders where necessary.
