# WayOnTop Monorepo - AI Agent Guidelines

## Project Context
WayOnTop is an AR wayfinding platform for large venues (currently Lalbagh Botanical Garden). The system is split into a **Consumer** mobile web app (AR navigation, gamification, offline resilience) and a **Producer** internal admin tool (MapLibre graph mapping, sponsor management). Both apps share components via the **packages/ui** workspace.

## Core Rules for AI Agents

### 1. Strictly Follow the Design System
You **MUST** adhere to the [Design System](docs/design-system.md) for all coding. 
- **Shared Packages Architecture:** All `shadcn/ui` components (buttons, cards, etc.), custom shared components (like `PermissionGate.tsx`), and core business logic (`lib/routing.ts`, `lib/supabase.ts`, `lib/types.ts`, `lib/utils.ts`) have been centralized in the `packages/ui/src/` workspace. 
- **Imports:** You MUST import these from the shared package rather than creating local copies. For example: `import { Button } from '@wayontop/ui/components/ui/button'`, `import { supabase } from '@wayontop/ui/lib/supabase'`, or `import type { GraphNode } from '@wayontop/ui/lib/types'`.
- **Styles:** The `consumer` and `producer` apps both import `@wayontop/ui/styles/shared.css`.
- **Aesthetic:** Dark mode by default (Dark Mesh) with vibrant Emerald Green accents. Heavy use of translucent glassmorphism (`backdrop-blur-xl`, `bg-black/40`).
- **Never** use generic utility colors (like `bg-white` or `blue-500`) for primary elements.

### 2. Documentation Maintenance
- You **MUST** read the `docs/` folder (especially `lalbagh-navigator-prd.md`) before making architectural or feature changes.
- You **MUST** actively update the `docs/` folder in your working directory whenever you implement new patterns or significant features. Keep the source of truth updated.

### 3. Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, shadcn/ui.
- **Maps**: MapLibre GL JS (`react-map-gl`).
- **Monorepo**: NPM Workspaces.
- **Backend**: Supabase (Postgres).

### 4. Workflow & Tooling
- **Skills & MCP Servers**: You **MUST** actively utilize the skills and MCP servers (like `shadcn`, `playwright`, etc.) at your disposal. Do not manually rewrite boilerplate if a tool can do it perfectly.
- **Installing New UI Components (CRITICAL)**: If you need a new shadcn component, you MUST navigate into the shared package to install it: `cd packages/ui && npx shadcn-ui@latest add <component>`. Do NOT run the add command from inside the consumer or producer apps.
- **Best Practices Only**: Never compromise on code quality. Always implement industry-standard best practices, robust error handling, and scalable architectures.
- **Code Quality & Linting Rules**:
  1. **Readonly Props**: Always mark component props as `Readonly<{ ... }>` for immutability.
  2. **Low Cognitive Complexity**: Refactor large functions into smaller, single-purpose helper functions to keep cognitive complexity under 15.
  3. **Limit Nesting**: Do not nest functions or blocks more than 4 levels deep. (e.g., when mapping over arrays, avoid deep nesting by using lookup Maps or extracting callback functions).
  4. **Optional Chaining**: Prefer `obj?.prop` instead of `obj && obj.prop` for cleaner, more concise code.
  5. **Dependency Arrays**: Always maintain accurate and exhaustive dependency arrays in hooks like `useMemo`, `useEffect`, and `useCallback`.
  6. **JSX Self-Closing Tags**: Always unfold empty tags into self-closing JSX elements (e.g., `<div />` instead of `<div></div>`).

*Read `consumer/AGENTS.md` and `producer/AGENTS.md` for app-specific context.*

### 5. Ultimate Pro UI/UX
The UI MUST be a pro combo of:
1. **Apple**: Minimalist, frosted glass, deeply refined smooth micro-animations.
2. **Google Maps**: Clean utility, high performance, highly readable map features and navigation.
3. **Pokemon Go**: Dynamic, engaging gamification, and intuitive AR overlays.
4. **Strava**: Energetic metric tracking, rewarding physical movement, and community-driven social proof.

The design MUST be **mobile-first and UX-friendly**. Optimize ruthlessly for one-handed thumb reach on mobile devices. Ensure flawless responsiveness, 100/100 performance, and perfectly harmonious layouts with no oddly placed elements or giant banners.
