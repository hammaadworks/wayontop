# Adding or Updating a Language

WayOnTop relies on a `jsonb`-based localization architecture. This makes adding a new language (e.g., Spanish `"es"`) highly scalable because it doesn't require complex SQL schema migrations for new columns.

To add a new language to the platform, follow this checklist across the monorepo:

## 1. Update Core Types (`packages/ui`)
The platform strictly types all localized content to ensure no missing translations crash the app. Update the global types in `packages/ui/src/lib/types.ts`:

```typescript
// Add the new language code (e.g., 'es') to the Record types
export type LocalizedText = Record<'en' | 'kn' | 'hi' | 'es', string>;
export type LocalizedList = Record<'en' | 'kn' | 'hi' | 'es', string[]>;
```

## 2. Backfill Supabase JSONB Data
Because Supabase stores localized fields (`name`, `description`, `synonyms`) as `jsonb` objects, you do not need to add new SQL columns. 

However, you must run a script or SQL query to backfill existing rows so they include the new language key as an empty string. This ensures the frontend doesn't encounter `undefined` properties.

**Example SQL Backfill for `nodes` table:**
```sql
UPDATE nodes 
SET name = name || '{"es": ""}'::jsonb;
```

## 3. Update the Map Editor (Producer App)
Admins need a way to input the new translations. In `producer/src/components/`, locate the form components used for creating and editing Nodes and Categories.
- Add a new text input field for the new language (e.g., Spanish Name, Spanish Description).
- Update the form state and validation schemas (e.g., Zod) to require or accept the new language key.

## 4. Update the Consumer App
The tourist-facing app needs to expose the new language and render it safely.

1. **Language Switcher UI:** Add the new language (e.g., "Español") to the language selector dropdown in the user settings or navigation sheet.
2. **Dynamic Content Rendering:** Ensure that dynamic text (like a monument's name) checks for the user's language and falls back to English if the translation is empty:
   ```tsx
   const displayName = node.name?.[userLang] || node.name?.en || 'Unnamed';
   ```
3. **Static UI Translations:** If you are using an i18n library or JSON dictionaries for static buttons (like "Start Navigation", "Map", "AR Mode"), create the corresponding `es.json` translation file and wire it into your translation provider.
