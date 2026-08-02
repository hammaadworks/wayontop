# WayOnTop Brand Design System

This document outlines the official brand style and design system for all WayOnTop applications, including the Consumer and Producer apps.

**CRITICAL DIRECTIVE**: All future UI/UX development MUST follow this brand style. No exceptions. Both Consumer and Producer applications must feel like they were built by the same team, sharing the same premium aesthetic.

## 1. Core Aesthetic
Our design philosophy heavily borrows from Apple's sleek hardware/software integration and Google Maps' clean utility, with a modern "glassmorphism" overlay that feels futuristic yet highly legible.

- **Theme**: Dark mode by default (Dark Mesh) with vibrant, glowing accents.
- **Glassmorphism**: Heavy use of translucent panels (`backdrop-blur-xl`, `bg-black/40`, `border-white/10`) to create depth and hierarchy without opaque blocks.
- **Typography**: Clean, sans-serif fonts (like Inter or San Francisco/Geist), utilizing varied weights for hierarchy (bold white for primary text, slate-300/400 for secondary).
- **Rounding**: Soft, approachable corners. Large border radii on main cards (`rounded-2xl`, `rounded-3xl`), pill-shaped buttons (`rounded-full`).

## 2. Design Tokens & Components (`packages/ui`)
All design tokens and `shadcn/ui` components are strictly centralized in the `@wayontop/ui` package to ensure 100% consistency across the monorepo.
- **Component Imports:** Always import components from the shared package: `import { Card } from '@wayontop/ui/components/ui/card'`.
- **Custom Shared Components:** Foundational UI like `PermissionGate.tsx` are also centralized here.

### Colors
- **Backgrounds**: `bg-mesh-dark` (an animated, subtle mesh gradient providing a dynamic backdrop).
- **Primary Accent**: Emerald Green (`emerald-400` to `emerald-600`). Used for primary actions, success states, and glowing accents. Represents "go", "nature" (parks like Lalbagh), and "active".
- **Secondary Accents**: Pink/Indigo gradients for special gamified features (like Stamps).
- **Text**: `text-white` for primary text, `text-slate-300` or `text-slate-400` for subtitles, captions, and secondary information.
- **Borders**: Highly subtle. `border-white/10` or `border-white/20` to define edges of glass panels.

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
  - `float`: Custom keyframe for elements like the AR stamp to gently bob up and down.
  - `pulse`: Used on recording/active states.

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
