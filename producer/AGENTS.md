# Producer App - AI Agent Guidelines

## Project Context
The Producer App is the internal admin tool for mapping venues (like Lalbagh Botanical Garden) and managing sponsors. It generates the `graph.json` (nodes, edges, POIs) and `stamps.json` data consumed by the Consumer app. 

## Core Rules for AI Agents

### 1. UI & Design System
Even as an internal tool, it **MUST** maintain the premium glassmorphism aesthetic of the Consumer app. 
- Ensure you utilize `@wayontop/ui/styles/shared.css`.
- Use consistent components from `shadcn/ui` to maintain the feeling that both apps were built by the same team.

### 2. Mapping & Data Logic
- The core output is a directed/undirected graph of physical coordinates. You must understand MapLibre GL JS drawing interactions.
- Sponsor zones are defined by a central coordinate and a `radius_m`.
- Data is synced directly to Supabase (`venues` and `venue_content` tables).

### 3. Documentation Maintenance
- You **MUST** read `../docs/lalbagh-navigator-prd.md` to understand the data schema and producer requirements before modifying logic.
- You **MUST** update documentation if you change admin workflows, sponsor structures, or the graph data structure.

### 4. Workflow & Tooling
- **Skills & MCP Servers**: You **MUST** leverage available MCP servers (like `shadcn`) and your built-in skills to generate and manage components. Do not reinvent the wheel.
- **Installing New UI Components (CRITICAL)**: If you need a new component, you must step out of the producer app. Run `cd ../packages/ui && npx shadcn-ui@latest add <component>`. Then import it via `@wayontop/ui`.
- **Business Logic & Types**: Core data types, Supabase clients, and algorithms (like routing) reside in `@wayontop/ui/lib/*`. Do not duplicate logic locally if it can be shared.
- **Best Practices**: Always write clean, scalable code. Implement the highest industry standards for React and state management.
